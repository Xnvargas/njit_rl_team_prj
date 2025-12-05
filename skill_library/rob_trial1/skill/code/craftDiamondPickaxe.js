// main function to craft one diamond pickaxe
async function craftDiamondPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // 1️⃣ Ensure we have the required materials
  const neededDiamonds = 3;
  const neededSticks = 2;
  const haveDiamonds = countItem('diamond');
  const haveSticks = countItem('stick');
  if (haveDiamonds < neededDiamonds) {
    bot.chat(`❌ I only have ${haveDiamonds} diamond(s); need ${neededDiamonds} to craft a diamond pickaxe.`);
    return;
  }
  if (haveSticks < neededSticks) {
    bot.chat(`❌ I only have ${haveSticks} stick(s); need ${neededSticks} to craft a diamond pickaxe.`);
    return;
  }
  bot.chat(`✅ Materials check passed (diamonds: ${haveDiamonds}, sticks: ${haveSticks}).`);

  // 2️⃣ Ensure a crafting table is placed nearby
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!craftingTableBlock) {
    // we need to place one
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('❌ No crafting table item in inventory to place.');
      return;
    }

    // find a suitable air block next to the bot
    const basePos = bot.entity.position.floored();
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1), new Vec3(0, 1, 0), new Vec3(0, -1, 0)];
    let placePos = null;
    for (const off of offsets) {
      const pos = basePos.plus(off);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') {
        // ensure there is at least one solid neighbor to attach to
        const neighborDirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
        for (const nd of neighborDirs) {
          const nb = bot.blockAt(pos.plus(nd));
          if (nb && nb.name !== 'air') {
            placePos = pos;
            break;
          }
        }
        if (placePos) break;
      }
    }
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot to place a crafting table.');
      return;
    }
    bot.chat(`📦 Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    // re‑assign after placement
    craftingTableBlock = bot.blockAt(placePos);
    if (!craftingTableBlock || craftingTableBlock.name !== 'crafting_table') {
      bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    bot.chat('✅ Crafting table placed.');
  } else {
    bot.chat('✅ Crafting table already nearby.');
  }

  // 3️⃣ Craft the diamond pickaxe
  bot.chat('🔨 Crafting diamond pickaxe...');
  await craftItem(bot, 'diamond_pickaxe', 1);

  // 4️⃣ Verify the result
  const pickaxe = bot.inventory.findInventoryItem(mcData.itemsByName.diamond_pickaxe.id);
  if (pickaxe) {
    bot.chat('✅ Successfully crafted a diamond pickaxe!');
  } else {
    bot.chat('⚠️ Crafting failed – diamond pickaxe not found in inventory.');
  }
}