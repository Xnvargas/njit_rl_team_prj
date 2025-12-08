// -----------------------------------------------------------------------------
// Helper: random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// Helper: find a free air block directly above a **solid, non‑fluid** block

// Helper: find a free air block directly above a **solid, non‑fluid** block
async function findFreePlacementSpot(bot, radius = 3) {
  const mcData = require('minecraft-data')(bot.version);
  const botPos = bot.entity.position.floored();

  // helper to decide whether a block can support placement
  const isSolidGround = block => {
    if (!block) return false;
    if (block.name === 'air') return false;
    if (block.name.includes('water') || block.name.includes('lava')) return false;
    // most solid blocks have a non‑empty bounding box
    return block.boundingBox !== 'empty';
  };
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const groundPos = botPos.offset(dx, dy, dz);
        const groundBlock = bot.blockAt(groundPos);
        if (!isSolidGround(groundBlock)) continue;
        const placePos = groundPos.offset(0, 1, 0); // the block we will place on
        const above = bot.blockAt(placePos);
        const head = bot.blockAt(placePos.offset(0, 1, 0));
        if (above && above.name === 'air' && head && head.name === 'air') {
          return placePos; // suitable spot
        }
      }
    }
  }
  return null;
}

// Ensure a crafting table is placed nearby and return its block position

// Ensure a crafting table is placed nearby and return its block position
async function ensureCraftingTable(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Look for an already placed table
  const existing = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (existing) {
    await bot.pathfinder.goto(new GoalNear(existing.position.x, existing.position.y, existing.position.z, 1));
    await bot.chat('Found a placed crafting table.');
    return existing.position;
  }

  // 2️⃣ Need to place one from inventory
  const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
  if (!tableItem) {
    await bot.chat('❌ No crafting table item in inventory.');
    throw new Error('Missing crafting table');
  }

  // 3️⃣ Find a valid spot
  let spot = await findFreePlacementSpot(bot, 3);
  while (!spot) {
    await bot.chat('No free spot for table, exploring...');
    const found = await exploreUntil(bot, randomDirection(), 60, () => findFreePlacementSpot(bot, 3) ? true : null);
    if (!found) break;
    spot = await findFreePlacementSpot(bot, 3);
  }
  if (!spot) {
    await bot.chat('❌ Could not locate a suitable position to place a crafting table.');
    throw new Error('No placement spot');
  }

  // 4️⃣ Place the table
  await bot.chat(`Placing crafting table at ${spot}`);
  await placeItem(bot, 'crafting_table', spot);
  await bot.pathfinder.goto(new GoalNear(spot.x, spot.y, spot.z, 1));
  await bot.chat('Crafting table placed.');
  return spot;
}

// -----------------------------------------------------------------------------
// Main function: craft one shield

// -----------------------------------------------------------------------------
// Main function: craft one shield
async function craftOneShield(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Helper to count items by name
  const countItem = name => bot.inventory.count(mcData.itemsByName[name].id);

  // 1️⃣ Ensure we have at least 6 planks (any type). Use oak_planks as default.
  const plankName = 'oak_planks';
  const neededPlanks = 6;
  let havePlanks = countItem(plankName);
  if (havePlanks < neededPlanks) {
    const missing = neededPlanks - havePlanks;
    await bot.chat(`Need ${missing} more planks.`);

    // Mine logs if necessary
    const logsNeeded = Math.ceil(missing / 4);
    await bot.chat(`Mining ${logsNeeded} oak log(s)...`);
    await mineBlock(bot, 'oak_log', logsNeeded);

    // Ensure a crafting table to craft planks
    await ensureCraftingTable(bot);
    const batches = Math.ceil(missing / 4);
    await bot.chat(`Crafting ${batches} batch(es) of oak planks...`);
    await craftItem(bot, plankName, batches);
    havePlanks = countItem(plankName);
    await bot.chat(`Now have ${havePlanks} planks.`);
  } else {
    await bot.chat(`Plank count sufficient (${havePlanks}).`);
  }

  // 2️⃣ Ensure we have at least 1 iron ingot
  const ironIngotId = mcData.itemsByName.iron_ingot.id;
  if (bot.inventory.count(ironIngotId) < 1) {
    await bot.chat('❌ No iron ingot available, cannot craft shield.');
    return;
  }

  // 3️⃣ Ensure a crafting table is present (may already be placed)
  await ensureCraftingTable(bot);

  // 4️⃣ Craft the shield
  await bot.chat('Crafting the shield...');
  await craftItem(bot, 'shield', 1);
  const shieldId = mcData.itemsByName.shield.id;
  if (bot.inventory.findInventoryItem(shieldId)) {
    await bot.chat('✅ Shield crafted successfully!');
  } else {
    await bot.chat('❌ Failed to craft the shield.');
  }
}