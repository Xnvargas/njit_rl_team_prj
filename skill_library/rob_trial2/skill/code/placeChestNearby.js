// main function: place a chest near the bot
async function placeChestNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Check if a chest is already placed nearby
  const existingChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (existingChest) {
    await bot.chat('✅ Chest is already placed nearby.');
    return;
  }

  // 2️⃣ Ensure we have a chest item in inventory
  const chestItemInfo = mcData.itemsByName['chest'];
  const chestStack = bot.inventory.findInventoryItem(chestItemInfo.id);
  if (!chestStack) {
    await bot.chat('❌ No chest item in inventory – cannot place a chest.');
    return;
  }

  // 3️⃣ Find a solid reference block close to the bot
  const referenceBlock = bot.findBlock({
    matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
    maxDistance: 32
  });
  if (!referenceBlock) {
    await bot.chat('❌ Could not locate a solid block to place the chest against.');
    return;
  }

  // 4️⃣ Determine a free air position adjacent to the reference block
  const offsets = [new Vec3(0, 1, 0),
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
  for (const off of offsets) {
    const candidate = referenceBlock.position.offset(off.x, off.y, off.z);
    if (bot.blockAt(candidate).name === 'air') {
      placePos = candidate;
      break;
    }
  }
  if (!placePos) {
    await bot.chat('❌ No suitable air block found next to the reference block.');
    return;
  }

  // 5️⃣ Place the chest
  await bot.chat(`📦 Placing chest at ${placePos.x}, ${placePos.y}, ${placePos.z}...`);
  await placeItem(bot, 'chest', placePos);
  await bot.waitForTicks(5); // give the world a moment to update

  // 6️⃣ Verify placement
  const placedChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (placedChest) {
    await bot.chat('✅ Chest placed successfully!');
  } else {
    await bot.chat('❌ Failed to place the chest.');
  }
}