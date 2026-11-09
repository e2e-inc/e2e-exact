import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';

// e2e loads no .env file itself.
try {
  process.loadEnvFile(new URL('.env.local', import.meta.url));
} catch {}

// app.json's app.id: the iOS bundle id. `npm run ios` builds and installs the app under it.
const bundleId = 'dev.e2e.shelf';

export default {
  // The Vercel AI Gateway serves the model and reads AI_GATEWAY_API_KEY.
  // Only tests that use `agent` need it; the others run without one.
  agents: {
    default: {
      model: gateway('openai/gpt-6-luna-fast'),
      system: 'You are a thorough QA agent. Verify every outcome.',
    },
  },
  targets: [
    {
      name: 'web',
      engine: web(),
      app: {
        url: 'http://127.0.0.1:8765',
        // The release build, served as a site would be. A running `npm run preview` is reused.
        command: {
          executable: 'npm',
          args: ['run', 'preview'],
          reuseExisting: true,
          startupTimeout: 300_000,
          log: '.e2e/logs/web.log',
        },
      },
    },
    {
      name: 'ios',
      engine: mobile({ platform: 'ios', device: process.env.IOS_DEVICE || undefined }),
      // English text and keyboard, whatever the simulator's region.
      app: { bundleId, launchArguments: ['-AppleLocale', 'en_US', '-AppleLanguages', '(en)'] },
    },
  ],
  workers: 2,
} satisfies E2EConfig;
