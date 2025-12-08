// main function: mine exactly one diamond ore safely
async function mineOneDiamondOreSafe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // ---------- helpers ----------
  // 1. Equip an iron (or better) pickaxe
  async function ensurePickaxe() {
    const order = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
    for (const name of order) {
      const id = mcData.itemsByName[name].id;
      const item = bot.inventory.findInventoryItem(id);
      if (item) {
        await bot.equip(item, "hand");
        await bot.chat(`✅ Pickaxe equipped: ${name}`);
        return true;
      }
    }
    await bot.chat("❌ No pickaxe (iron or better) found.");
    return false;
  }

  // 2. Ensure we have a weapon (sword preferred)
  async function ensureWeapon() {
    const swordId = mcData.itemsByName.iron_sword.id;
    let weapon = bot.inventory.findInventoryItem(swordId);
    if (weapon) {
      await bot.equip(weapon, "hand");
      await bot.chat("✅ Iron sword equipped.");
      return true;
    }
    const bowId = mcData.itemsByName.bow.id;
    weapon = bot.inventory.findInventoryItem(bowId);
    if (weapon) {
      await bot.equip(weapon, "hand");
      await bot.chat("✅ Bow equipped.");
      return true;
    }
    await bot.chat("❌ No weapon (sword or bow) available.");
    return false;
  }

  // 3. Eat if needed
  async function ensureFood() {
    if (bot.food >= 12 && bot.health >= 14) return;
    const foodItem = bot.inventory.items().find(i => i.food);
    if (!foodItem) {
      await bot.chat("⚠️ No food found, continuing without eating.");
      return;
    }
    await bot.equip(foodItem, "hand");
    await bot.consume();
    await bot.chat("🍗 Eating food.");
  }

  // 4. Random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 5. Try to kill a nearby creeper; if it fails, move away and retry
  async function handleCreeper() {
    const creeper = bot.nearestEntity(e => e.name === "creeper" && e.position.distanceTo(bot.entity.position) < 12);
    if (!creeper) return true; // no threat

    await bot.chat("⚔️ Creeper spotted! Attempting to eliminate.");
    if (!(await ensureWeapon())) return false;

    // Try up to 3 attempts; on failure move away and retry
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await killMob(bot, "creeper", 30);
        await bot.chat("✅ Creeper eliminated.");
        return true;
      } catch (e) {
        await bot.chat(`❗ Kill attempt ${attempt} failed: ${e.message}`);
        // move a few blocks away in a random safe direction
        const dir = randomDirection();
        const safePos = bot.entity.position.plus(dir.scaled(5));
        await bot.pathfinder.goto(new GoalNear(safePos.x, safePos.y, safePos.z, 1));
        // give it a short pause before retrying
        await bot.waitForTicks(10);
      }
    }
    await bot.chat("❌ Could not safely remove the creeper.");
    return false;
  }

  // 6. Locate a deepslate diamond ore block
  async function findDiamondOre() {
    const oreId = mcData.blocksByName.deepslate_diamond_ore.id;
    let ore = bot.findBlock({
      matching: oreId,
      maxDistance: 32
    });
    if (ore) return ore;
    await bot.chat("🔎 Exploring for deepslate diamond ore...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: oreId,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    if (!found) return null;
    return bot.findBlock({
      matching: oreId,
      maxDistance: 32
    });
  }

  // ---------- execution ----------
  // 1) Pickaxe
  if (!(await ensurePickaxe())) return;

  // 2) Food / health safety
  await ensureFood();

  // 3) Deal with creepers
  if (!(await handleCreeper())) return;

  // 4) Find the diamond ore
  const diamondOre = await findDiamondOre();
  if (!diamondOre) {
    await bot.chat("❌ No deepslate diamond ore found within the time limit.");
    return;
  }
  await bot.chat(`✅ Diamond ore located at ${diamondOre.position}`);

  // 5) Move next to the ore
  await bot.pathfinder.goto(new GoalNear(diamondOre.position.x, diamondOre.position.y, diamondOre.position.z, 1));

  // 6) Mine exactly one ore
  await bot.chat("⛏️ Mining the diamond ore...");
  await mineBlock(bot, "deepslate_diamond_ore", 1);

  // 7) Verify we got a diamond
  const diamondId = mcData.itemsByName.diamond.id;
  const count = bot.inventory.count(diamondId);
  if (count > 0) {
    await bot.chat(`✅ Success! Collected ${count} diamond(s).`);
  } else {
    await bot.chat("❌ Mining finished but no diamond was obtained.");
  }
}