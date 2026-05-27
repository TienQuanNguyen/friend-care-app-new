import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iovvklliosftzeyecpul.supabase.co',
  'sb_publishable_VOAs6w-eHKUr5NIGVClB9A_HI2Zye1f'
);

async function test() {
  console.log('Sending reset password email...');
  const { data, error } = await supabase.auth.resetPasswordForEmail('tienquan0807@gmail.com', {
    redirectTo: 'http://localhost:5173/update-password'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
