// Automatically use the Prod URL if built, otherwise default to Localhost
const server = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

export default server;