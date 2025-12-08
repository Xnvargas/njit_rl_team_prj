// ------------------------------------------------------------
// Helper: count how many redstone dust items are in inventory
function countRedstoneDust(bot, mcData) {
  const redstoneInfo = mcData.itemsByName['redstone'];
  if (!redstoneInfo) return 0;
  const stack = bot.inventory.findInventoryItem(redstoneInfo.id);
  return stack ? stack.count : 0;
}

// Helper: pick a random direction (including down)

// Helper: pick a random direction (including down)
function randomDirection() {
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, -1, 0) // downwards
  ];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

// ------------------------------------------------------------
// Main function: mine at least 5 redstone dust

// ------------------------------------------------------------
// Main function: mine at least 5 redstone dust
async function mineFiveRedstoneDust(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  await bot.chat('🔎 Starting task: collect 5 redstone dust.');

  // 1️⃣ Ensure we have an iron (or better) pickaxe equipped
  const pickaxe = bot.inventory.items().find(item => {
    const name = mcData.items[item.type]?.name;
    return name && name.endsWith('_pickaxe') && (name.startsWith('iron') || name.startsWith('diamond') || name.startsWith('netherite'));
  });
  if (!pickaxe) {
    await bot.chat('❌ No iron or better pickaxe in inventory – cannot mine redstone ore.');
    return;
  }
  await bot.equip(pickaxe, 'hand');
  await bot.chat('🪓 Equipped iron pickaxe for mining.');

  // 2️⃣ Loop until we have 5 redstone dust
  while (countRedstoneDust(bot, mcData) < 5) {
    // Try to find redstone ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName.redstone_ore.id,
      maxDistance: 32
    });

    // If not found, explore in a random direction (including down)
    if (!oreBlock) {
      const dir = randomDirection();
      await bot.chat(`🚶‍♂️ Exploring ${dir} to locate redstone ore...`);
      oreBlock = await exploreUntil(bot, dir, 120,
      // seconds
      () => bot.findBlock({
        matching: mcData.blocksByName.redstone_ore.id,
        maxDistance: 32
      }));
      if (!oreBlock) {
        await bot.chat('❌ No redstone ore found in this direction. Trying another direction...');
        continue; // try another iteration with a new random direction
      }
    }

    // Mine the found ore block
    await bot.chat(`⛏️ Found redstone ore at ${oreBlock.position}. Mining...`);
    await mineBlock(bot, 'redstone_ore', 1);
    // Give the game a moment to drop the dust
    await bot.waitForTicks(10);

    // Report current count
    const current = countRedstoneDust(bot, mcData);
    await bot.chat(`📦 Collected ${current} redstone dust so far.`);
  }
  await bot.chat('✅ Task complete – you now have at least 5 redstone dust!');
}