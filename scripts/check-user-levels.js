const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE0OTk2OCwiZXhwIjoyMDcyNzI1OTY4fQ.-P7oGicaUyK_9BB0rNHxIFXo3u86Lu4ONDJ6Bc9ORO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserLevels() {
  console.log('🔍 Checking user levels and model access...\n');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, display_name, created_at, is_admin');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.length} users in database\n`);

    // Get all promo codes
    const { data: promoCodes, error: promoError } = await supabase
      .from('promo_codes')
      .select('id, code, access_type, max_uses, used_count, is_active');

    if (promoError) {
      console.error('❌ Error fetching promo codes:', promoError);
      return;
    }

    // Get user promo access
    const { data: userAccess, error: accessError } = await supabase
      .from('user_promo_access')
      .select('user_id, promo_code_id, redeemed_at');

    if (accessError) {
      console.error('❌ Error fetching user access:', accessError);
      return;
    }

    // Create a map of promo codes
    const promoCodeMap = new Map();
    promoCodes.forEach(code => {
      promoCodeMap.set(code.id, code);
    });

    // Create a map of user access
    const userAccessMap = new Map();
    userAccess.forEach(access => {
      if (!userAccessMap.has(access.user_id)) {
        userAccessMap.set(access.user_id, []);
      }
      userAccessMap.set(access.user_id, [
        ...userAccessMap.get(access.user_id),
        access.promo_code_id
      ]);
    });

    // Define Level 1 models
    const level1Models = [
      'nano-banana-text-to-image',
      'flux-dev-text-to-image', 
      'minimax-hailuo-02-pro-image-to-video',
      'kling-video-v2-1-master-image-to-video',
      'minimax-endframe-text-to-video',
      'runway-aleph-image-to-video'
    ];

    console.log('🎯 Level 1 Beta Models:');
    level1Models.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model}`);
    });
    console.log('');

    // Analyze each user
    let level1Users = 0;
    let level3Users = 0;
    let level5Users = 0;
    let noAccessUsers = 0;

    users.forEach(user => {
      const userPromoCodes = userAccessMap.get(user.id) || [];
      let userLevel = 1; // Default Level 1 for existing users
      let accessType = 'Level 1 (Default)';

      // Check if user has promo code access
      if (userPromoCodes.length > 0) {
        const promoCode = promoCodeMap.get(userPromoCodes[0]);
        if (promoCode && promoCode.is_active) {
          if (promoCode.access_type === 'secret_level') {
            userLevel = 3;
            accessType = 'Level 3 (Promo Code)';
          } else if (promoCode.access_type === 'premium') {
            userLevel = 5;
            accessType = 'Level 5 (Premium)';
          }
        }
      }

      // Admin users get Level 5
      if (user.is_admin || user.email === '1deeptechnology@gmail.com') {
        userLevel = 5;
        accessType = 'Level 5 (Admin)';
      }

      // Count by level
      if (userLevel === 1) level1Users++;
      else if (userLevel === 3) level3Users++;
      else if (userLevel === 5) level5Users++;
      else noAccessUsers++;

      console.log(`👤 ${user.email || user.name || 'Unknown'}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   🎯 Level: ${userLevel}`);
      console.log(`   🔑 Access: ${accessType}`);
      console.log(`   📊 Models Available: ${userLevel === 1 ? '6 (Level 1 Beta)' : userLevel === 3 ? '15+ (Level 3)' : '25+ (Level 5)'}`);
      console.log('');
    });

    // Summary
    console.log('📈 SUMMARY:');
    console.log(`   Level 1 Users: ${level1Users} (6 Beta Models Only)`);
    console.log(`   Level 3 Users: ${level3Users} (Promo Code Access)`);
    console.log(`   Level 5 Users: ${level5Users} (Admin/Premium Access)`);
    console.log(`   No Access: ${noAccessUsers}`);
    console.log(`   Total Users: ${users.length}`);
    console.log('');

    // Check promo codes
    console.log('🎫 PROMO CODES:');
    promoCodes.forEach(code => {
      console.log(`   Code: ${code.code}`);
      console.log(`   Type: ${code.access_type}`);
      console.log(`   Uses: ${code.used_count}/${code.max_uses || '∞'}`);
      console.log(`   Active: ${code.is_active ? '✅' : '❌'}`);
      console.log('');
    });

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Run the check
checkUserLevels();
