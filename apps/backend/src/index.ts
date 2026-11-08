import { createApp } from './app.ts';
import { createDependencies } from './composition-root.ts';

const app = createApp(createDependencies());

export default app;
