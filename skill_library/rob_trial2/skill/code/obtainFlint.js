// -----------------------------------------------------------------------------
// Helper: count how many flint items are in the bot's inventory
function countFlint(bot, mcData) {
  const flintInfo = mcData.itemsByName['flint'];
  if (!flintInfo) return 0;
  const stack = bot.inventory.findInventoryItem(flintInfo.id);
  return stack ? stack.count : 0;
}

// Helper: return a random horizontal direction (X or Z non‑zero, Y = 0)

// Helper: return a random horizontal direction (X or Z non‑zero, Y = 0)
function randomHorizontalDirection() {
  const vals = [-1, 0, 1];
  let x = 0,
    z = 0;
  while (x === 0 && z === 0) {
    x = vals[Math.floor(Math.random() * vals.length)];
    z = vals[Math.floor(Math.random() * vals.length)];
  }
  return new (require('vec3').Vec3)(x, 0, z);
}

// -----------------------------------------------------------------------------
// Main function: obtain at least 1 flint

// -----------------------------------------------------------------------------
// Main function: obtain at least 1 flint
async function obtainFlint(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  await bot.chat('🔎 Starting task: obtain 1 flint.');

  // 1️⃣ Already have flint?
  if (countFlint(bot, mcData) >= 1) {
    await bot.chat('✅ Flint already in inventory.');
    return;
  }

  // 2️⃣ Loop until we have at least one flint
  while (countFlint(bot, mcData) < 1) {
    // a) Find a gravel block nearby
    let gravelBlock = bot.findBlock({
      matching: mcData.blocksByName.gravel.id,
      maxDistance: 32
    });

    // b) If not found, explore in a random direction
    if (!gravelBlock) {
      const dir = randomHorizontalDirection();
      await bot.chat(`🚶‍♂️ Exploring ${dir} to locate gravel...`);
      gravelBlock = await exploreUntil(bot, dir, 120, () => bot.findBlock({
        matching: mcData.blocksByName.gravel.id,
        maxDistance: 32
      }));
      if (!gravelBlock) {
        await bot.chat('❌ No gravel found this direction, trying another...');
        continue; // retry with a new random direction
      }
    }

    // c) (Optional) equip a shovel if we have one – improves speed
    const shovel = bot.inventory.items().find(item => {
      const name = mcData.items[item.type]?.name;
      return name && name.endsWith('_shovel');
    });
    if (shovel) await bot.equip(shovel, 'hand');

    // d) Mine the gravel block
    await bot.chat(`⛏️ Mining gravel at ${gravelBlock.position}...`);
    await mineBlock(bot, 'gravel', 1);
    // give the game a moment to register the drop
    await bot.waitForTicks(10);

    // e) Report current flint count
    const current = countFlint(bot, mcData);
    await bot.chat(`📦 Flint count now: ${current}`);
  }
  await bot.chat('✅ Obtained at least 1 flint! Task complete.');
}