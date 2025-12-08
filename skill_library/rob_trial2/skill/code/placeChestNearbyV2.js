// main function: place a chest near the bot
async function placeChestNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Check if a chest is already placed nearby
  const nearbyChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (nearbyChest) {
    await bot.chat('✅ Chest is already placed nearby.');
    return;
  }

  // 2️⃣ Make sure we have a chest item in inventory
  const chestItemInfo = mcData.itemsByName['chest'];
  const chestStack = bot.inventory.findInventoryItem(chestItemInfo.id);
  if (!chestStack) {
    await bot.chat('❌ No chest item in inventory – cannot place a chest.');
    return;
  }

  // helper: offsets to the six adjacent blocks
  const offsets = [new Vec3(1, 0, 0),
  // east
  new Vec3(-1, 0, 0),
  // west
  new Vec3(0, 1, 0),
  // above
  new Vec3(0, -1, 0),
  // below
  new Vec3(0, 0, 1),
  // south
  new Vec3(0, 0, -1) // north
  ];

  // 3️⃣ Try a few times to find a solid block with a free neighbour
  let placePos = null;
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts && !placePos; attempt++) {
    // find a solid reference block near the bot
    let reference = bot.findBlock({
      matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
      maxDistance: 32
    });

    // if we couldn't find one, explore a random direction first
    if (!reference) {
      const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      const randDir = dirs[Math.floor(Math.random() * dirs.length)];
      await bot.chat(`🚶‍♂️ Exploring a bit to locate a solid block (attempt ${attempt + 1})...`);
      await exploreUntil(bot, randDir, 60, () => {
        const blk = bot.findBlock({
          matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
          maxDistance: 32
        });
        return blk ? true : null;
      });
      reference = bot.findBlock({
        matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
        maxDistance: 32
      });
    }
    if (!reference) {
      await bot.chat('❌ Still could not find a solid block to anchor the chest.');
      break;
    }

    // look for an adjacent air block
    for (const off of offsets) {
      const candidate = reference.position.offset(off.x, off.y, off.z);
      if (bot.blockAt(candidate).name === 'air') {
        placePos = candidate;
        break;
      }
    }

    // if not found, move a short distance and try again
    if (!placePos) {
      const move = new Vec3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
      await bot.pathfinder.goto(new GoalNear(bot.entity.position.x + move.x, bot.entity.position.y, bot.entity.position.z + move.z, 2));
      await bot.waitForTicks(10);
    }
  }
  if (!placePos) {
    await bot.chat('❌ Failed to find a free spot to place the chest.');
    return;
  }

  // 4️⃣ Place the chest
  await bot.chat(`📦 Placing chest at ${placePos.x}, ${placePos.y}, ${placePos.z}...`);
  await placeItem(bot, 'chest', placePos);
  await bot.waitForTicks(5); // give the world a moment to update

  // 5️⃣ Verify placement
  const placedChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (placedChest) {
    await bot.chat('✅ Chest placed successfully!');
  } else {
    await bot.chat('❌ Chest placement failed.');
  }
}