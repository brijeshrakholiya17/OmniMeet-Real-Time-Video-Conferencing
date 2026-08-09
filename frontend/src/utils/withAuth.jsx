import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();

        const isAuthenticated = () => {
            const token = localStorage.getItem("token");
            if (!token) return false;

            const payload = parseJwt(token);
            if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                return false;
            }
            return true;
        };

        useEffect(() => {
            if (!isAuthenticated()) {
                router("/auth", { 
                    state: { 
                        message: "Your session has expired. Please log in again.", 
                        formState: 0 
                    } 
                });
            }
        }, []);

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;