import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5005/api";

export const http = axios.create({
  baseURL
});

