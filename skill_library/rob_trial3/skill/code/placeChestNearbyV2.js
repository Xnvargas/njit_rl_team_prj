// Main function to place a chest near the bot
async function placeChestNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Check if a chest already exists nearby (within 5 blocks)
  const existingChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (existingChest) {
    await bot.chat(`✅ Chest already present at ${existingChest.position}.`);
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
    matching: b => b && b.name !== "air",
    maxDistance: 3
  });
  if (!reference) {
    await bot.chat("❌ No solid block nearby to use as a placement reference.");
    return;
  }

  // 4️⃣ Determine possible placement positions around the reference block
  const candidateOffsets = [new Vec3(0, 1, 0),
  // on top
  new Vec3(1, 0, 0),
  // east
  new Vec3(-1, 0, 0),
  // west
  new Vec3(0, 0, 1),
  // south
  new Vec3(0, 0, -1) // north
  ];
  let placePos = null;
  for (const off of candidateOffsets) {
    const pos = reference.position.plus(off);
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

  // 5️⃣ Place the chest
  await bot.chat(`Placing chest at ${placePos}...`);
  try {
    await placeItem(bot, "chest", placePos);
  } catch (err) {
    await bot.chat(`❌ Failed to place chest: ${err.message}`);
    return;
  }

  // 6️⃣ Verify placement
  const placed = bot.blockAt(placePos);
  if (placed && placed.name === "chest") {
    await bot.chat(`✅ Chest successfully placed at ${placePos}.`);
  } else {
    await bot.chat("❌ Chest placement failed.");
  }
}