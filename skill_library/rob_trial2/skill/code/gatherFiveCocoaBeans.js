// -----------------------------------------------------------------------------
// Helper: count how many cocoa beans are in the bot's inventory
function countCocoaBeans(bot, mcData) {
  const beanInfo = mcData.itemsByName['cocoa_beans'];
  if (!beanInfo) return 0;
  const stack = bot.inventory.findInventoryItem(beanInfo.id);
  return stack ? stack.count : 0;
}

// Helper: generate a random horizontal direction (X or Z = ±1, Y = 0)

// Helper: generate a random horizontal direction (X or Z = ±1, Y = 0)
function randomHorizontalDirection() {
  const vals = [-1, 0, 1];
  let x = 0,
    z = 0;
  while (x === 0 && z === 0) {
    x = vals[Math.floor(Math.random() * vals.length)];
    z = vals[Math.floor(Math.random() * vals.length)];
  }
  return new Vec3(x, 0, z);
}

// -----------------------------------------------------------------------------
// Main function: gather at least 5 cocoa beans

// -----------------------------------------------------------------------------
// Main function: gather at least 5 cocoa beans
async function gatherFiveCocoaBeans(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  await bot.chat('🔎 Starting cocoa bean gathering (target: 5 beans).');

  // Loop until we have 5 or more beans
  while (countCocoaBeans(bot, mcData) < 5) {
    // 1️⃣ Try to locate a cocoa block nearby
    let cocoaBlock = bot.findBlock({
      matching: mcData.blocksByName.cocoa.id,
      maxDistance: 32
    });

    // 2️⃣ If not found, explore in a random direction
    if (!cocoaBlock) {
      const dir = randomHorizontalDirection();
      await bot.chat(`🚶‍♂️ Exploring direction ${dir} to find cocoa pods...`);
      cocoaBlock = await exploreUntil(bot, dir, 120, () => bot.findBlock({
        matching: mcData.blocksByName.cocoa.id,
        maxDistance: 32
      }));
      if (!cocoaBlock) {
        await bot.chat('❌ Could not locate any cocoa pods after exploring. Trying a new direction...');
        continue; // go to next iteration to pick a new direction
      }
    }

    // 3️⃣ Mine the found cocoa block (break the pod)
    await bot.chat(`🌱 Found cocoa pod at ${cocoaBlock.position}. Harvesting...`);
    // mineBlock will collect the block and the dropped beans
    await mineBlock(bot, 'cocoa', 1);
    // give the game a short tick to register drops
    await bot.waitForTicks(10);

    // 4️⃣ Report current bean count
    const beans = countCocoaBeans(bot, mcData);
    await bot.chat(`📦 Currently have ${beans} cocoa bean(s).`);
  }
  await bot.chat('✅ Collected at least 5 cocoa beans! Task complete.');
}