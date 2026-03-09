let memoryToken: string | null = null;

export const setToken = (t: string | null) => {
    memoryToken = t;
};

export const getToken = () => memoryToken;
