// ------------------------------------------------------------
// Helper: count items in inventory
function countItem(bot, mcData, name) {
  const info = mcData.itemsByName[name];
  if (!info) return 0;
  const stack = bot.inventory.findInventoryItem(info.id);
  return stack ? stack.count : 0;
}

// Helper: find a free air block that has a solid neighbour

// Helper: find a free air block that has a solid neighbour
async function findFreePlacement(bot) {
  const {
    Vec3
  } = require('vec3');
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0), new Vec3(0, -1, 0)];

  // try blocks around the bot first
  const reference = bot.findBlock({
    matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
    maxDistance: 32
  });
  if (reference) {
    for (const off of directions) {
      const pos = reference.position.offset(off.x, off.y, off.z);
      if (bot.blockAt(pos).name === 'air') return pos;
    }
  }

  // fallback: explore a bit until we locate a suitable spot
  const exploreDirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  for (let i = 0; i < 5; i++) {
    const dir = exploreDirs[Math.floor(Math.random() * exploreDirs.length)];
    const found = await exploreUntil(bot, dir, 60, () => {
      const solid = bot.findBlock({
        matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
        maxDistance: 32
      });
      if (!solid) return null;
      for (const off of directions) {
        const p = solid.position.offset(off.x, off.y, off.z);
        if (bot.blockAt(p).name === 'air') return p;
      }
      return null;
    });
    if (found) return found;
  }
  return null; // none found
}

// ------------------------------------------------------------
// Main function: craft a single clock

// ------------------------------------------------------------
// Main function: craft a single clock
async function craftClock(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Verify materials
  const goldNeeded = 4;
  const redstoneNeeded = 1;
  const goldCount = countItem(bot, mcData, 'gold_ingot');
  const redstoneCount = countItem(bot, mcData, 'redstone');
  if (goldCount < goldNeeded) {
    await bot.chat(`❌ Need ${goldNeeded} gold ingots (have ${goldCount}).`);
    return;
  }
  if (redstoneCount < redstoneNeeded) {
    await bot.chat(`❌ Need ${redstoneNeeded} redstone dust (have ${redstoneCount}).`);
    return;
  }
  await bot.chat('✅ Required materials are present.');

  // 2️⃣ Ensure a crafting table is placed nearby
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🛠️ No crafting table nearby – fetching one from a chest...');
    // Chest that we know contains crafting tables
    const chestPos = new Vec3(-46, 62, -604);
    await getItemFromChest(bot, chestPos, {
      crafting_table: 1
    });
    await bot.waitForTicks(5); // let inventory update

    // Find a free spot to place it
    const placePos = await findFreePlacement(bot);
    if (!placePos) {
      await bot.chat('❌ Could not find a free spot to place the crafting table.');
      return;
    }
    await bot.chat(`📍 Placing crafting table at ${placePos.x}, ${placePos.y}, ${placePos.z}`);
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5); // world update

    // Verify placement
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    await bot.chat('✅ Crafting table placed successfully.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // 3️⃣ Craft the clock
  await bot.chat('🕒 Crafting a clock...');
  await craftItem(bot, 'clock', 1);
  await bot.waitForTicks(5); // inventory refresh

  // 4️⃣ Verify result
  const clockInfo = mcData.itemsByName['clock'];
  const clockStack = bot.inventory.findInventoryItem(clockInfo.id);
  if (clockStack && clockStack.count >= 1) {
    await bot.chat('✅ Clock crafted successfully!');
  } else {
    await bot.chat('❌ Crafting failed – no clock in inventory.');
  }
}