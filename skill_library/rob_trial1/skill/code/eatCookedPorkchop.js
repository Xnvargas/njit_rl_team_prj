// main function to eat a cooked porkchop
async function eatCookedPorkchop(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ---------- 1. check we have a cooked porkchop ----------
  if (countItem('cooked_porkchop') < 1) {
    bot.chat('I have no cooked porkchop to eat.');
    return;
  }

  // ---------- 2. get the item and equip it ----------
  const porkItem = bot.inventory.findInventoryItem(mcData.itemsByName.cooked_porkchop.id);
  if (!porkItem) {
    bot.chat('Strange, I could not locate the cooked porkchop in my inventory.');
    return;
  }
  await bot.equip(porkItem, 'hand');
  bot.chat('Cooked porkchop equipped, preparing to eat...');

  // ---------- 3. eat it ----------
  try {
    await bot.consume(); // right‑click / use action
    bot.chat(`Ate a cooked porkchop. Hunger is now ${bot.food}.`);
  } catch (err) {
    bot.chat(`Failed to eat the porkchop: ${err.message}`);
  }
}