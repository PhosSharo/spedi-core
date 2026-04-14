#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <TinyGPSPlus.h>
#include <math.h>

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================
#define WIFI_SSID      "WikWek"
#define WIFI_PASSWORD  "11334455"

// Railway TCP Proxy — plain TCP (no TLS)
#define MQTT_BROKER    "metro.proxy.rlwy.net"
#define MQTT_PORT      41220
#define MQTT_USERNAME  "device"
#define MQTT_PASS      "spedi2026"
#define MQTT_CLIENT_ID "spedi-device-01"

// ============================================================================
// PIN MAP — ESP32-S3
// ============================================================================
#define RPWM_PIN        5
#define LPWM_PIN        6
#define R_EN_PIN        7
#define L_EN_PIN        15
#define SERVO_PIN       4

#define TRIG_LEFT_PIN   10
#define ECHO_LEFT_PIN   11
#define TRIG_RIGHT_PIN  12
#define ECHO_RIGHT_PIN  13

#define PIN_BUZZER      21
#define PIN_LED         20
#define PIN_PUMP        47   // Relay/MOSFET cooling pump 5V

// GPS NEO-M8N — HardwareSerial1
#define GPS_RX_PIN      16
#define GPS_TX_PIN      17

// ============================================================================
// NAVIGATION & PHYSICS PARAMETERS
// ============================================================================
#define SERVO_CENTER      90
#define SERVO_MAX_LEFT    45
#define SERVO_MAX_RIGHT   135

#define SERVO_STEP_DEG    2
#define SERVO_INTERVAL_MS 12

#define MAX_SPEED         255
#define TURN_SPEED        120
#define AVOID_SPEED       130
#define APPROACH_SPEED    160

#define OBSTACLE_DIST     80
#define CRITICAL_DIST     35

#define RAMP_INTERVAL_MS  25
#define RAMP_UP_STEP      8
#define RAMP_DOWN_STEP    12
#define JOYSTICK_TIMEOUT  2000
#define SONAR_INTERVAL    60

// Waypoint navigation
#define WP_ARRIVAL_RADIUS_M  3.0f   // Consider waypoint reached within 3 meters
#define WP_NAV_SPEED         180    // Cruising speed during autonomous navigation

// ============================================================================
// UBX COMMANDS — NEO-M8N FAST LOCK TUNING
// ============================================================================

// NAV5: Stationary model
static const uint8_t UBX_NAV5_STATIONARY[] = {
  0xB5,0x62,0x06,0x24,0x24,0x00,
  0xFF,0xFF,
  0x02, 0x03,
  0x00,0x00, 0x10,0x27,
  0x05,0x00, 0xFA,0x00,
  0xFA,0x00, 0x64,0x00,
  0x2C,0x01, 0x00, 0x3C,
  0x00,0x00,0x00,0x00,0x00,0x00,
  0x00,0x00,0x00,0x00
};

// SBAS ON
static const uint8_t UBX_SBAS_ON[] = {
  0xB5,0x62,0x06,0x16,0x08,0x00,
  0x01,0x03,0x00,0x00,0x00,0x00,0x00,0x00
};

// HOT START
static const uint8_t UBX_HOTSTART[] = {
  0xB5,0x62,0x06,0x04,0x04,0x00,
  0x00,0x00,0x00,0x00
};

// RATE 5 Hz (200 ms)
static const uint8_t UBX_RATE_5HZ[] = {
  0xB5,0x62,0x06,0x08,0x06,0x00,
  0xC8,0x00,0x01,0x00,0x01,0x00
};

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
HardwareSerial   gpsSerial(1);
TinyGPSPlus      gps;

WiFiClient       wifiClient;          // Plain TCP — Railway proxy handles routing
PubSubClient     mqttClient(wifiClient);
Servo            steeringServo;

// ============================================================================
// TOPICS — must match backend (ACL enforced)
//   Device can READ:  spedi/vehicle/joystick, spedi/vehicle/route
//   Device can WRITE: spedi/vehicle/status,   spedi/vehicle/camera
// ============================================================================
const char* TOPIC_JOYSTICK = "spedi/vehicle/joystick";
const char* TOPIC_ROUTE    = "spedi/vehicle/route";
const char* TOPIC_STATUS   = "spedi/vehicle/status";

// ============================================================================
// STATE MACHINE
// ============================================================================

// Operating modes — must match backend shadow desired.mode
enum DeviceMode {
  MODE_IDLE,
  MODE_MANUAL,
  MODE_AUTO
};

const char* modeToString(DeviceMode m) {
  switch (m) {
    case MODE_MANUAL: return "manual";
    case MODE_AUTO:   return "auto";
    default:          return "idle";
  }
}

struct Waypoint {
  double lat;
  double lng;
};

#define MAX_WAYPOINTS 50

struct SystemState {
  DeviceMode mode          = MODE_IDLE;

  bool  gpsLocked          = false;
  bool  gpsBuzzDone        = false;

  int   currentSpeed       = 0;
  int   targetSpeed        = 0;

  int   servoTarget        = SERVO_CENTER;
  int   servoCurrent       = SERVO_CENTER;

  bool  smartMoveActive    = false;   // Obstacle avoidance engaged (reported to shadow)
  bool  isAvoiding         = false;

  // Autonomous navigation
  bool     autopilotActive = false;
  Waypoint waypoints[MAX_WAYPOINTS];
  int      waypointCount   = 0;
  int      waypointIndex   = 0;

  // Timers
  unsigned long lastRamp          = 0;
  unsigned long lastServoUpdate   = 0;
  unsigned long lastCommand       = 0;
  unsigned long lastSonarRead     = 0;
  unsigned long lastStatusPublish = 0;
  unsigned long lastGpsCheck      = 0;
  unsigned long lastMqttRetry     = 0;
} S;

// Sonar median filter
#define FILTER_SAMPLES 5
int leftBuf[FILTER_SAMPLES]  = {400,400,400,400,400};
int rightBuf[FILTER_SAMPLES] = {400,400,400,400,400};
int bufIdx = 0;

// ============================================================================
// UTILITY
// ============================================================================

void beep(int durMs, int count) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(durMs);
    digitalWrite(PIN_BUZZER, LOW);  delay(durMs);
  }
}

void sendUBX(const uint8_t* msg, uint16_t len) {
  gpsSerial.write(msg, len);
  delay(60);
}

/// Haversine distance in meters between two GPS coordinates
double haversineM(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);
  double a = sin(dLat / 2.0) * sin(dLat / 2.0) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon / 2.0) * sin(dLon / 2.0);
  return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

/// Bearing in degrees from point 1 to point 2
double bearingDeg(double lat1, double lon1, double lat2, double lon2) {
  double dLon = radians(lon2 - lon1);
  double y = sin(dLon) * cos(radians(lat2));
  double x = cos(radians(lat1)) * sin(radians(lat2)) -
             sin(radians(lat1)) * cos(radians(lat2)) * cos(dLon);
  double brng = degrees(atan2(y, x));
  return fmod(brng + 360.0, 360.0);
}

// ============================================================================
// GPS
// ============================================================================

void feedGPS() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());
}

bool checkGpsLock() {
  return gps.location.isValid()
      && gps.location.age() < 2000
      && gps.hdop.isValid()
      && gps.hdop.hdop() < 2.5f
      && gps.satellites.isValid()
      && gps.satellites.value() >= 4;
}

void reconnectMqttSilent() {
  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASS)) {
    mqttClient.subscribe(TOPIC_JOYSTICK);
    mqttClient.subscribe(TOPIC_ROUTE);
  }
}

void waitForGpsLock() {
  Serial.println("[GPS] Waiting for GPS lock... all systems FROZEN");
  unsigned long lastPrint = 0;
  bool ledState = false;

  while (true) {
    feedGPS();

    if (millis() - lastPrint > 500) {
      lastPrint = millis();
      ledState = !ledState;
      digitalWrite(PIN_LED, ledState);
      Serial.printf("[GPS] Fix:%s | Sat:%u | HDOP:%.1f | Lat:%.6f | Lng:%.6f\n",
        gps.location.isValid() ? "YES" : "NO",
        (unsigned)gps.satellites.value(),
        gps.hdop.isValid() ? gps.hdop.hdop() : 99.9f,
        gps.location.lat(),
        gps.location.lng()
      );
    }

    // Keep MQTT alive during GPS wait so dashboard sees device online
    if (WiFi.status() == WL_CONNECTED) {
      if (!mqttClient.connected()) reconnectMqttSilent();
      mqttClient.loop();
    }

    if (checkGpsLock()) {
      S.gpsLocked = true;
      digitalWrite(PIN_LED, HIGH);
      Serial.println("[GPS] *** GPS LOCKED! *** 3-second buzzer...");
      beep(1000, 3);
      S.gpsBuzzDone = true;
      Serial.printf("[GPS] Lock OK — Lat:%.6f Lng:%.6f Sat:%u HDOP:%.2f\n",
        gps.location.lat(), gps.location.lng(),
        (unsigned)gps.satellites.value(), gps.hdop.hdop());
      return;
    }
  }
}

// ============================================================================
// SERVO — smooth interpolation
// ============================================================================

void updateServoSmooth() {
  if (millis() - S.lastServoUpdate < SERVO_INTERVAL_MS) return;
  S.lastServoUpdate = millis();
  if (S.servoCurrent == S.servoTarget) return;
  int diff = S.servoTarget - S.servoCurrent;
  S.servoCurrent += (abs(diff) <= SERVO_STEP_DEG)
    ? diff
    : ((diff > 0) ? SERVO_STEP_DEG : -SERVO_STEP_DEG);
  steeringServo.write(S.servoCurrent);
}

void setServoTarget(int angle) {
  S.servoTarget = constrain(angle, SERVO_MAX_LEFT, SERVO_MAX_RIGHT);
}

// ============================================================================
// MOTOR PHYSICS — ramped acceleration
// ============================================================================

void setMotorRaw(int speed) {
  speed = constrain(speed, -MAX_SPEED, MAX_SPEED);
  if      (speed > 0) { ledcWrite(LPWM_PIN, 0);     ledcWrite(RPWM_PIN,  speed); }
  else if (speed < 0) { ledcWrite(RPWM_PIN, 0);     ledcWrite(LPWM_PIN, -speed); }
  else                { ledcWrite(RPWM_PIN, 0);     ledcWrite(LPWM_PIN,      0); }
}

void updateMotorPhysics() {
  if (millis() - S.lastRamp < RAMP_INTERVAL_MS) return;
  S.lastRamp = millis();
  int diff = S.targetSpeed - S.currentSpeed;
  if      (diff >  RAMP_UP_STEP)   S.currentSpeed += RAMP_UP_STEP;
  else if (diff < -RAMP_DOWN_STEP) S.currentSpeed -= RAMP_DOWN_STEP;
  else                             S.currentSpeed  = S.targetSpeed;
  setMotorRaw(S.currentSpeed);
}

// ============================================================================
// ULTRASONIC SENSORS — filtered obstacle detection
// ============================================================================

int readFilteredDist(int trig, int echo, int* buf) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long dur = pulseIn(echo, HIGH, 25000);
  int  raw = (dur == 0) ? 400 : (int)(dur * 0.017f);
  buf[bufIdx] = raw;
  long sum = 0;
  for (int i = 0; i < FILTER_SAMPLES; i++) sum += buf[i];
  return (int)(sum / FILTER_SAMPLES);
}

/// Returns true if obstacle avoidance took over steering/throttle
bool processAvoidance() {
  if (millis() - S.lastSonarRead < SONAR_INTERVAL) return S.isAvoiding;
  S.lastSonarRead = millis();

  int dL = readFilteredDist(TRIG_LEFT_PIN,  ECHO_LEFT_PIN,  leftBuf);
  int dR = readFilteredDist(TRIG_RIGHT_PIN, ECHO_RIGHT_PIN, rightBuf);
  bufIdx = (bufIdx + 1) % FILTER_SAMPLES;

  bool wasAvoiding = S.isAvoiding;

  if (dL < CRITICAL_DIST && dR < CRITICAL_DIST) {
    S.targetSpeed = -AVOID_SPEED; setServoTarget(SERVO_CENTER);
    S.isAvoiding = true;
  } else if (dL < OBSTACLE_DIST) {
    S.targetSpeed = AVOID_SPEED; setServoTarget(SERVO_MAX_RIGHT);
    S.isAvoiding = true;
  } else if (dR < OBSTACLE_DIST) {
    S.targetSpeed = AVOID_SPEED; setServoTarget(SERVO_MAX_LEFT);
    S.isAvoiding = true;
  } else {
    S.isAvoiding = false;
  }

  S.smartMoveActive = S.isAvoiding;
  return S.isAvoiding;
}

// ============================================================================
// COMMAND: JOYSTICK  (from server via MQTT)
//   Payload: { "throttle": -100..100, "steering": -100..100 }
//   Backend publishes these at ~5 Hz from the mobile WebSocket.
// ============================================================================

void handleJoystick(JsonDocument& doc) {
  if (!S.gpsLocked) return;

  // Joystick commands are rejected by the server if smartMoveActive is true,
  // but we enforce it device-side too as a safety net.
  if (S.smartMoveActive) return;

  // Abort any autonomous route — manual control takes priority
  if (S.mode == MODE_AUTO) {
    S.autopilotActive = false;
    S.waypointCount   = 0;
    S.waypointIndex   = 0;
    Serial.println("[NAV] Autonomous route aborted — manual override");
  }
  S.mode = MODE_MANUAL;

  int throttle = doc["throttle"] | 0;   // -100 to 100
  int steering = doc["steering"] | 0;   // -100 to 100

  // Map throttle -100..100 to motor speed -MAX_SPEED..MAX_SPEED
  S.targetSpeed = (int)((float)throttle / 100.0f * MAX_SPEED);

  // Map steering -100..100 to servo angle (negative = left)
  int servoAngle = SERVO_CENTER + (int)((float)steering / 100.0f * 45.0f);
  setServoTarget(servoAngle);

  S.lastCommand = millis();
}

// ============================================================================
// COMMAND: ROUTE (from server via MQTT)
//   Payload: { "action": "start"|"stop", "waypoints": [{"lat":..,"lng":..}] }
//   Backend publishes this when user dispatches a route from mobile app.
// ============================================================================

void handleRoute(JsonDocument& doc) {
  if (!S.gpsLocked) return;

  const char* action = doc["action"] | "";

  if (strcmp(action, "start") == 0) {
    JsonArray wps = doc["waypoints"];
    int count = min((int)wps.size(), MAX_WAYPOINTS);
    if (count < 2) {
      Serial.println("[NAV] Route rejected — need >= 2 waypoints");
      return;
    }

    for (int i = 0; i < count; i++) {
      S.waypoints[i].lat = wps[i]["lat"] | 0.0;
      S.waypoints[i].lng = wps[i]["lng"] | 0.0;
    }
    S.waypointCount   = count;
    S.waypointIndex   = 0;
    S.autopilotActive = true;
    S.mode            = MODE_AUTO;

    Serial.printf("[NAV] Route started: %d waypoints\n", count);
  }
  else if (strcmp(action, "stop") == 0) {
    S.autopilotActive = false;
    S.waypointCount   = 0;
    S.waypointIndex   = 0;
    S.targetSpeed     = 0;
    S.mode            = MODE_IDLE;
    setServoTarget(SERVO_CENTER);
    Serial.println("[NAV] Route stopped by server");
  }
}

// ============================================================================
// AUTONOMOUS NAVIGATION — waypoint GPS steering
//   Runs every loop() tick when autopilotActive == true.
//   The server detects route completion when autopilot_active flips false.
// ============================================================================

void updateAutopilot() {
  if (!S.autopilotActive || S.waypointIndex >= S.waypointCount) {
    // Route complete — transition out
    if (S.autopilotActive) {
      S.autopilotActive = false;
      S.targetSpeed     = 0;
      S.mode            = MODE_IDLE;
      setServoTarget(SERVO_CENTER);
      Serial.println("[NAV] All waypoints reached — route complete");
    }
    return;
  }

  if (!gps.location.isValid() || gps.location.age() > 2000) return;

  double curLat = gps.location.lat();
  double curLng = gps.location.lng();
  double tgtLat = S.waypoints[S.waypointIndex].lat;
  double tgtLng = S.waypoints[S.waypointIndex].lng;

  double dist    = haversineM(curLat, curLng, tgtLat, tgtLng);
  double bearing = bearingDeg(curLat, curLng, tgtLat, tgtLng);
  double heading = gps.course.isValid() ? gps.course.deg() : bearing;

  // Check arrival
  if (dist < WP_ARRIVAL_RADIUS_M) {
    S.waypointIndex++;
    Serial.printf("[NAV] Waypoint %d reached (%.1fm). Next: %d/%d\n",
      S.waypointIndex, dist, S.waypointIndex + 1, S.waypointCount);
    return;
  }

  // Obstacle avoidance takes priority over navigation steering
  if (processAvoidance()) return;

  // Compute heading error and steer toward waypoint
  double error = bearing - heading;
  if (error > 180.0)  error -= 360.0;
  if (error < -180.0) error += 360.0;

  // Proportional steering: clamp error to servo range
  int steerAngle = SERVO_CENTER + (int)(error / 90.0 * 45.0);
  setServoTarget(constrain(steerAngle, SERVO_MAX_LEFT, SERVO_MAX_RIGHT));

  // Speed: slow down when approaching waypoint or turning hard
  if (dist < 5.0) {
    S.targetSpeed = APPROACH_SPEED;
  } else if (abs((int)error) > 45) {
    S.targetSpeed = TURN_SPEED;
  } else {
    S.targetSpeed = WP_NAV_SPEED;
  }
}

// ============================================================================
// MQTT
// ============================================================================

void reconnectMqtt() {
  if (millis() - S.lastMqttRetry < 5000) return;  // Rate-limit retries
  S.lastMqttRetry = millis();

  Serial.println("[MQTT] Connecting...");
  if (!mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASS)) {
    Serial.printf("[MQTT] Failed, rc=%d\n", mqttClient.state());
    return;
  }

  // Subscribe only to topics the device is allowed to READ (per ACL)
  mqttClient.subscribe(TOPIC_JOYSTICK);
  mqttClient.subscribe(TOPIC_ROUTE);
  Serial.println("[MQTT] Connected to broker.");
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (!S.gpsLocked) {
    Serial.println("[MQTT] Command ignored — waiting for GPS lock.");
    return;
  }

  JsonDocument doc;
  if (deserializeJson(doc, payload, length) != DeserializationError::Ok) return;

  String t(topic);

  if      (t == TOPIC_JOYSTICK) { handleJoystick(doc); }
  else if (t == TOPIC_ROUTE)    { handleRoute(doc); }
}

// ============================================================================
// TELEMETRY — published to spedi/vehicle/status every 2 seconds
//
// The backend shadow system uses these fields:
//   LOCKED (required for dashboard map):
//     lat, lng, satellite_count, waypoint_index, mode
//   FLEXIBLE (pass-through to shadow):
//     obstacle_left, obstacle_right, smart_move_active, autopilot_active,
//     bearing, speed, ...
// ============================================================================

void publishTelemetry() {
  if (!mqttClient.connected()) return;
  if (millis() - S.lastStatusPublish < 2000) return;
  S.lastStatusPublish = millis();

  int dL = readFilteredDist(TRIG_LEFT_PIN, ECHO_LEFT_PIN, leftBuf);
  int dR = readFilteredDist(TRIG_RIGHT_PIN, ECHO_RIGHT_PIN, rightBuf);

  JsonDocument doc;

  // ── Locked fields (required by dashboard map) ──────────────────
  doc["lat"]             = gps.location.isValid() ? gps.location.lat() : 0.0;
  doc["lng"]             = gps.location.isValid() ? gps.location.lng() : 0.0;
  doc["satellite_count"] = (int)gps.satellites.value();
  doc["waypoint_index"]  = S.waypointIndex;
  doc["mode"]            = modeToString(S.mode);

  // ── Flexible fields (mapped via telemetry_field_map in config) ─
  doc["obstacle_left"]     = dL;
  doc["obstacle_right"]    = dR;
  doc["smart_move_active"] = S.smartMoveActive;
  doc["autopilot_active"]  = S.autopilotActive;
  doc["bearing"]           = gps.course.isValid() ? gps.course.deg() : 0.0;
  doc["speed"]             = gps.speed.isValid()  ? gps.speed.kmph() : 0.0;
  doc["hdop"]              = gps.hdop.isValid()    ? gps.hdop.hdop()  : 99.99;
  doc["motor_speed"]       = S.currentSpeed;
  doc["gps_fix"]           = checkGpsLock();

  char buf[512];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(TOPIC_STATUS, buf);
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== SPEDI BOAT v12.0 — ESP32-S3 ===\n");

  // GPIO init
  pinMode(PIN_LED,        OUTPUT);
  pinMode(PIN_BUZZER,     OUTPUT);
  pinMode(PIN_PUMP,       OUTPUT);
  pinMode(R_EN_PIN,       OUTPUT); digitalWrite(R_EN_PIN, HIGH);
  pinMode(L_EN_PIN,       OUTPUT); digitalWrite(L_EN_PIN, HIGH);
  pinMode(TRIG_LEFT_PIN,  OUTPUT); pinMode(ECHO_LEFT_PIN,  INPUT);
  pinMode(TRIG_RIGHT_PIN, OUTPUT); pinMode(ECHO_RIGHT_PIN, INPUT);

  // Cooling pump ON at boot
  digitalWrite(PIN_PUMP, HIGH);
  Serial.println("[PUMP] Cooling pump ON.");

  // Motor PWM
  ledcAttach(RPWM_PIN, 1000, 8);
  ledcAttach(LPWM_PIN, 1000, 8);
  setMotorRaw(0);

  // Servo
  steeringServo.attach(SERVO_PIN);
  steeringServo.write(SERVO_CENTER);
  S.servoCurrent = SERVO_CENTER;
  S.servoTarget  = SERVO_CENTER;

  // GPS UART1
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  delay(300);
  Serial.println("[GPS] Sending UBX config to NEO-M8N...");
  sendUBX(UBX_NAV5_STATIONARY, sizeof(UBX_NAV5_STATIONARY));
  sendUBX(UBX_SBAS_ON,         sizeof(UBX_SBAS_ON));
  sendUBX(UBX_HOTSTART,        sizeof(UBX_HOTSTART));
  sendUBX(UBX_RATE_5HZ,        sizeof(UBX_RATE_5HZ));
  Serial.println("[GPS] Config sent. GPS boost active.");

  // WiFi
  Serial.printf("[WIFI] Connecting to: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WIFI] Connected! IP: " + WiFi.localIP().toString());
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setBufferSize(1024);   // Accommodate route payloads
    mqttClient.setCallback(onMqttMessage);
    reconnectMqtt();
  } else {
    Serial.println("[WIFI] Failed — MQTT inactive.");
  }

  beep(80, 2);  // 2 short beeps = hardware ready, waiting for GPS
  Serial.println("[SYSTEM] Hardware ready. Entering GPS Lock Gate...\n");

  // GPS LOCK GATE — block until valid fix
  waitForGpsLock();

  Serial.println("\n[SYSTEM] All systems ACTIVE. Boat ready!\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  feedGPS();

  // GPS health monitor (log only, do not re-freeze)
  if (millis() - S.lastGpsCheck > 5000) {
    S.lastGpsCheck = millis();
    if (!checkGpsLock())
      Serial.println("[GPS] WARNING: Fix lost / weak!");
  }

  // Motor & servo physics
  updateServoSmooth();
  updateMotorPhysics();

  // Mode-specific logic
  switch (S.mode) {
    case MODE_MANUAL:
      // Joystick timeout safety — stop motors if no command in 2 seconds
      if (millis() - S.lastCommand > JOYSTICK_TIMEOUT) {
        S.targetSpeed = 0;
      }
      // Run obstacle avoidance passively (sets smartMoveActive flag)
      processAvoidance();
      break;

    case MODE_AUTO:
      // Waypoint GPS navigation loop
      updateAutopilot();
      break;

    case MODE_IDLE:
    default:
      S.targetSpeed = 0;
      break;
  }

  // MQTT keepalive
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) reconnectMqtt();
    mqttClient.loop();
  }

  // Publish telemetry every 2 seconds (matches config table telemetry_interval_ms)
  publishTelemetry();
}