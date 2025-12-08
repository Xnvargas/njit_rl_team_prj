// main function to smelt three raw copper into copper ingots
async function smeltThreeCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- helpers ----------
  // random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // find a free air block directly above a solid block within radius
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === "air") continue; // need solid ground
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === "air") return abovePos;
        }
      }
    }
    return null;
  }

  // move an item from hot‑bar to a free inventory slot (>=3)
  async function relocateFuelToInventory(itemId, needed) {
    // collect all slots that contain the item
    const items = bot.inventory.items().filter(i => i.type === itemId);
    // count how many are already in slots >=3
    let alreadyGood = items.filter(i => i.slot >= 3).length;
    if (alreadyGood >= needed) return true; // enough already in good slots

    // find empty slots >=3
    const emptySlots = [];
    for (let s = 3; s < 36; s++) {
      if (!bot.inventory.slots[s]) emptySlots.push(s);
    }
    // move from hot‑bar (slots 0‑2) to empty slots
    for (const it of items) {
      if (alreadyGood >= needed) break;
      if (it.slot < 3 && emptySlots.length) {
        const target = emptySlots.shift();
        await bot.inventory.moveItem(it.slot, target, 1);
        alreadyGood++;
      }
    }
    // after moving, check again
    const finalCount = bot.inventory.items().filter(i => i.type === itemId && i.slot >= 3).length;
    return finalCount >= needed;
  }

  // ---------- 1️⃣ raw copper ----------
  const rawCopperId = mcData.itemsByName["raw_copper"].id;
  const rawCopperCount = bot.inventory.count(rawCopperId);
  if (rawCopperCount < 3) {
    await bot.chat(`❌ I only have ${rawCopperCount} raw copper. Need 3 to smelt.`);
    return;
  }
  await bot.chat(`✅ I have ${rawCopperCount} raw copper, ready to smelt 3.`);

  // ---------- 2️⃣ furnace ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName["furnace"].id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    await bot.chat("No furnace found, trying to place one...");

    // need furnace item
    const furnaceItemId = mcData.itemsByName["furnace"].id;
    const furnaceItem = bot.inventory.findInventoryItem(furnaceItemId);
    if (!furnaceItem) {
      await bot.chat("❌ I don't have a furnace item to place.");
      return;
    }

    // find placement spot
    let placePos = await findFreePlacementSpot(3);
    while (!placePos) {
      await bot.chat("No free spot nearby, exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(3);
        return p ? true : null;
      });
      if (found) placePos = await findFreePlacementSpot(3);else break;
    }
    if (!placePos) {
      await bot.chat("❌ Could not locate a suitable spot for the furnace.");
      return;
    }
    await placeItem(bot, "furnace", placePos);
    await bot.chat(`Placed furnace at ${placePos}`);
    furnaceBlock = bot.blockAt(placePos);
  } else {
    await bot.chat(`✅ Found a furnace at ${furnaceBlock.position}`);
  }

  // stand next to furnace
  await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));

  // ---------- 3️⃣ fuel (birch_log) ----------
  const birchLogId = mcData.itemsByName["birch_log"].id;
  const totalBirchLogs = bot.inventory.count(birchLogId);
  if (totalBirchLogs < 2) {
    await bot.chat(`❌ Need at least 2 birch logs for fuel, only have ${totalBirchLogs}.`);
    return;
  }

  // make sure at least 2 birch logs are in slots >=3
  const fuelReady = await relocateFuelToInventory(birchLogId, 2);
  if (!fuelReady) {
    await bot.chat("❌ Couldn't move enough birch logs out of the hot‑bar for fuel.");
    return;
  }
  await bot.chat(`✅ Fuel prepared: ${bot.inventory.count(birchLogId)} birch logs (≥ slot 3).`);

  // ---------- 4️⃣ smelt ----------
  await bot.chat("🔨 Starting smelting of 3 raw copper...");
  await smeltItem(bot, "raw_copper", "birch_log", 3);
  await bot.chat("✅ Smelting finished.");

  // ---------- 5️⃣ report ----------
  const copperIngotId = mcData.itemsByName["copper_ingot"].id;
  const finalIngotCount = bot.inventory.count(copperIngotId);
  await bot.chat(`✅ I now have ${finalIngotCount} copper ingot(s).`);
}