FROM eclipse-mosquitto:latest

# Copy configuration files
COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY acl /mosquitto/config/acl
COPY passwd /mosquitto/config/passwd

# Convert plaintext passwords to hashed format
RUN mosquitto_passwd -U /mosquitto/config/passwd

# Run Mosquitto
CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
