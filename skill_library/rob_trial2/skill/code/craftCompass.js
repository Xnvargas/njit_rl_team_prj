// -----------------------------------------------------------------------------
// Helper: find a free air block that has at least one solid neighbour
async function findFreePlacement(bot) {
  const {
    Vec3
  } = require('vec3');
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

  // 1️⃣ try immediate surroundings of the bot
  const reference = bot.findBlock({
    matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
    maxDistance: 32
  });
  if (reference) {
    for (const off of directions) {
      const pos = reference.position.offset(off.x, off.y, off.z);
      if (bot.blockAt(pos).name === 'air') return pos; // solid neighbour is `reference`
    }
  }

  // 2️⃣ if not found, explore randomly until we locate a suitable spot
  const exploreDirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  for (let attempt = 0; attempt < 5; attempt++) {
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
  return null; // nothing suitable found
}

// -----------------------------------------------------------------------------
// Main function: craft a single compass

// -----------------------------------------------------------------------------
// Main function: craft a single compass
async function craftCompass(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- 1. Verify materials -----
  const ironInfo = mcData.itemsByName['iron_ingot'];
  const redstoneInfo = mcData.itemsByName['redstone'];
  const ironStack = bot.inventory.findInventoryItem(ironInfo.id);
  const redstoneStack = bot.inventory.findInventoryItem(redstoneInfo.id);
  const ironCount = ironStack ? ironStack.count : 0;
  const redstoneCount = redstoneStack ? redstoneStack.count : 0;
  if (ironCount < 4) {
    await bot.chat(`❌ Need 4 iron ingots (have ${ironCount}).`);
    return;
  }
  if (redstoneCount < 1) {
    await bot.chat(`❌ Need redstone dust (have ${redstoneCount}).`);
    return;
  }
  await bot.chat('✅ Required materials are present.');

  // ----- 2. Ensure a crafting table is placed -----
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🛠️ No crafting table nearby – attempting to place one...');
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }
    const placePos = await findFreePlacement(bot);
    if (!placePos) {
      await bot.chat('❌ Could not find a free spot to place the crafting table.');
      return;
    }
    await bot.chat(`📍 Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5); // let the world update

    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Unexpected: crafting table still not detected after placement.');
      return;
    }
    await bot.chat('✅ Crafting table placed successfully.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // ----- 3. Craft the compass -----
  await bot.chat('🧭 Crafting a compass...');
  await craftItem(bot, 'compass', 1);
  await bot.waitForTicks(5); // inventory update

  // ----- 4. Verify result -----
  const compassInfo = mcData.itemsByName['compass'];
  const compassStack = bot.inventory.findInventoryItem(compassInfo.id);
  if (compassStack && compassStack.count >= 1) {
    await bot.chat('✅ Compass crafted successfully!');
  } else {
    await bot.chat('❌ Crafting failed – compass not found in inventory.');
  }
}