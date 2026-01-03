export const environment = {
  production: true,
  apiUrl:
    window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api'
      : 'https://resourceaugmented-backend.onrender.com/api',
  socketUrl: 'http://localhost:3000',
};
