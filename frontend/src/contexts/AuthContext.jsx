import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Helper function to decode JWT payload safely
const parseJwt = (token) => {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// Helper function to check if JWT token is expired
const isTokenExpired = (token) => {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
};

export const AuthProvider = ({ children }) => {

    const [userData, setUserData] = useState(null);
    const router = useNavigate();

    // 1. Restore & Validate Session on Mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUsername = localStorage.getItem("username");

        if (token) {
            if (isTokenExpired(token)) {
                console.warn("Expired JWT token found on mount. Clearing session.");
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                setUserData(null);
            } else {
                const payload = parseJwt(token);
                setUserData({ 
                    token, 
                    username: storedUsername || payload?.username || payload?.name || "" 
                });
            }
        } else {
            setUserData(null);
        }
    }, []);

    // 2. Global Response Interceptor for 401 Unauthorized
    useEffect(() => {
        const handleAuthError = (error) => {
            if (error.response && error.response.status === httpStatus.UNAUTHORIZED) {
                const requestUrl = error.config?.url || "";
                // Do not trigger session expiration redirect on authentication attempts (login/register)
                const isAuthEndpoint = requestUrl.includes("/login") || requestUrl.includes("/register");

                if (!isAuthEndpoint) {
                    console.warn("401 Unauthorized encountered. Session expired.");
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    setUserData(null);
                    router("/auth", {
                        state: {
                            message: "Your session has expired. Please log in again.",
                            formState: 0
                        }
                    });
                }
            }
            return Promise.reject(error);
        };

        const interceptor1 = client.interceptors.response.use((res) => res, handleAuthError);
        const interceptor2 = axios.interceptors.response.use((res) => res, handleAuthError);

        return () => {
            client.interceptors.response.eject(interceptor1);
            axios.interceptors.response.eject(interceptor2);
        };
    }, [router]);

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            });

            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                localStorage.setItem("username", request.data.username || username);
                setUserData({ token: request.data.token, username: request.data.username || username });
                router("/home");
                return request.data;
            }
        } catch (err) {
            throw err;
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        setUserData(null);
        router("/");
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    }

    const getMeetingSessions = async () => {
        try {
            let request = await axios.get(`${server}/api/meeting`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                meeting_code: meetingCode
            }, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            return request;
        } catch (e) {
            throw e;
        }
    }

    const data = {
        userData, 
        setUserData, 
        addToUserHistory, 
        getHistoryOfUser, 
        getMeetingSessions,
        handleRegister, 
        handleLogin,
        handleLogout
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
}