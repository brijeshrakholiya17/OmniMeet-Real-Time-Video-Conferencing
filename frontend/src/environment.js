// Automatically use the Prod URL if built, otherwise default to Localhost
const server = process.env.NODE_ENV === 'production' ? "" : "http://localhost:8000";

export default server;