// Run once locally with Deno. The output is gitignored; never print private keys.
import webpush from 'npm:web-push@3.6.7';
const target = '.env.push.local';
try {
  await Deno.stat(target);
  throw new Error('Existing VAPID file found; refusing to rotate keys accidentally.');
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
}
const keys = webpush.generateVAPIDKeys();
await Deno.writeTextFile(target, `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=mailto:tienquan0807@gmail.com\n`, { createNew: true, mode: 0o600 });
console.log('Created ignored VAPID secrets file. No keys printed.');
