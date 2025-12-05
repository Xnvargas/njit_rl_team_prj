// main function to kill one zombie
async function killOneZombie(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random horizontal direction (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. equip a weapon ----------
  let weaponItem = null;
  const preferredWeapons = ['iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  for (const w of preferredWeapons) {
    if (countItem(w) > 0) {
      weaponItem = bot.inventory.findInventoryItem(mcData.itemsByName[w].id);
      break;
    }
  }
  if (!weaponItem) {
    bot.chat('I have no weapon to fight the zombie.');
    return;
  }
  await bot.equip(weaponItem, 'hand');
  bot.chat(`Equipped ${weaponItem.name} for combat.`);

  // ---------- 2. locate a zombie ----------
  bot.chat('Searching for a zombie...');
  const zombie = await exploreUntil(bot, randomDirection(), 60, () => {
    const entity = bot.nearestEntity(e => e.name === 'zombie' && e.position.distanceTo(bot.entity.position) < 32);
    return entity || null;
  });
  if (!zombie) {
    bot.chat('Could not find any zombie nearby.');
    return;
  }
  bot.chat(`Zombie found at ${zombie.position}. Engaging...`);

  // ---------- 3. kill the zombie ----------
  await killMob(bot, 'zombie', 300);
  bot.chat('Zombie has been killed.');
}