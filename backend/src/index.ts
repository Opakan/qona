import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`[Qona API] Server running on http://localhost:${config.PORT}`);
  console.log(`[Qona API] Environment: ${config.NODE_ENV}`);
});
