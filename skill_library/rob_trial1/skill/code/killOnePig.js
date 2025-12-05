// main function to kill one pig
async function killOnePig(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count items in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1. Choose a pickaxe to use as a weapon
  const pickaxePriority = ['iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  let weapon = null;
  for (const name of pickaxePriority) {
    if (countItem(name) > 0) {
      weapon = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
      break;
    }
  }
  if (!weapon) {
    bot.chat('I have no pickaxe to fight the pig.');
    return;
  }

  // 2. Equip the weapon
  await bot.equip(weapon, 'hand');
  bot.chat(`Equipped ${weapon.name} for combat.`);

  // 3. Try to locate a pig nearby
  let pig = bot.nearestEntity(e => e.name === 'pig' && e.position.distanceTo(bot.entity.position) < 32);

  // 4. If not found, explore until a pig appears
  if (!pig) {
    // pick a random horizontal direction (components -1,0,1, not all zero)
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    bot.chat('No pig nearby, exploring...');
    pig = await exploreUntil(bot, randomDir, 60, () => {
      const e = bot.nearestEntity(ent => ent.name === 'pig' && ent.position.distanceTo(bot.entity.position) < 32);
      return e || null;
    });
  }

  // 5. If still not found, abort
  if (!pig) {
    bot.chat('Could not find any pig to kill.');
    return;
  }

  // 6. Kill the pig
  bot.chat(`Pig found at ${pig.position}. Attacking...`);
  await killMob(bot, 'pig', 300);
  bot.chat('Pig has been killed.');
}