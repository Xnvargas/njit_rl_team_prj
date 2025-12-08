// Main function to place a chest near the bot
async function placeChestNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const chestBlockId = mcData.blocksByName.chest.id;

  // 1️⃣ Check if a chest block already exists nearby (within 5 blocks)
  const nearbyChest = bot.findBlock({
    matching: chestBlockId,
    maxDistance: 5
  });
  if (nearbyChest) {
    await bot.chat(`✅ Chest already present at ${nearbyChest.position}. Task completed.`);
    return;
  }

  // 2️⃣ Ensure we have a chest item in inventory
  const chestItem = bot.inventory.findInventoryItem(mcData.itemsByName.chest.id);
  if (!chestItem) {
    await bot.chat("❌ I don't have a chest item in my inventory.");
    return;
  }

  // 3️⃣ Find a solid reference block close to the bot (within 3 blocks)
  const reference = bot.findBlock({
    matching: b => b.name !== "air",
    maxDistance: 3
  });
  if (!reference) {
    await bot.chat("❌ No solid block nearby to use as a placement reference.");
    return;
  }

  // 4️⃣ Candidate positions for the chest (relative to the reference block)
  const candidates = [reference.position.offset(0, 1, 0),
  // on top
  reference.position.offset(1, 0, 0),
  // east
  reference.position.offset(-1, 0, 0),
  // west
  reference.position.offset(0, 0, 1),
  // south
  reference.position.offset(0, 0, -1) // north
  ];

  // 5️⃣ Choose the first air block among candidates
  let placePos = null;
  for (const pos of candidates) {
    const block = bot.blockAt(pos);
    if (block && block.name === "air") {
      placePos = pos;
      break;
    }
  }
  if (!placePos) {
    await bot.chat("❌ Couldn't find a free air block next to a solid block to place the chest.");
    return;
  }

  // 6️⃣ Place the chest
  await bot.chat(`Placing chest at ${placePos}...`);
  try {
    await placeItem(bot, "chest", placePos);
  } catch (err) {
    await bot.chat(`❌ Failed to place chest: ${err.message}`);
    return;
  }

  // 7️⃣ Verify placement
  const placedChest = bot.blockAt(placePos);
  if (placedChest && placedChest.name === "chest") {
    await bot.chat(`✅ Chest successfully placed at ${placePos}. Task completed.`);
  } else {
    await bot.chat("❌ Chest placement failed.");
  }
}