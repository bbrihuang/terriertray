# TerrierTrays

**Know what to put on your tray before you get to the dining hall.**

TerrierTrays reads the real menus from Boston University's dining halls and helps you build a plate that fits your calories, your allergies and your diet. It runs in your browser. You don't need an account.

> Unofficial student project. Not affiliated with or endorsed by Boston University.

## What you can do

- **See what's being served.** West Campus, Warren Towers and Marciano Commons, up to a week ahead, meal by meal, with posted hours.
- **Get suggested plates.** Set a daily calorie target and TerrierTrays suggests up to three plates from the current meal, using whole dining-hall servings. Don't like a dish? Tap **Not this** and it finds another. **Why this plan?** shows how it chose.
- **Build your own plate.** Add dishes from the Menu tab and watch the totals add up against your meal's share of the day.
- **See the whole day.** Below the meal selector, **Your daily totals** combines planned plates across halls for the selected date, with calories, protein, carbs and fat against your daily targets.
- **Plan the week.** The Week tab lays out suggested meals for the next seven days at one hall.
- **Filter for allergies and diets.** Avoid specific allergens, or show only dishes labelled vegetarian, vegan, halal or gluten-free.
- **Light or dark.** Tap the sun/moon button in the top corner.

## Getting started

1. **Pick your dining hall and day** in the card at the top of the Plan tab.
2. **Set your targets.** Tap **Estimate my calories** to use our model, or type your own numbers in **Settings → Daily targets**. The calculator starts with feet, inches and pounds; you can switch to cm and kg. Optional macro splits are available for review before you apply.
3. **Answer the allergy question** in Settings. Suggestions stay off until you do, so nothing is recommended before your restrictions are known.
4. **Go to Plan** and choose a suggested plate, or add dishes yourself from **Menu**.

## The calorie estimate

Our team trained a model that estimates daily calories from your age, gender, height, weight and activity level.

- **You stay in control.** Nothing changes until you tap **Apply**. Review calories and optional macro targets first. Uncheck **Include suggested macros** to change calories while keeping your manual protein, carb and fat targets.
- **Cutting or bulking?** Choose a goal and enter how many calories to subtract or add each day. It starts at 10% of the estimate, and you can change it. The model estimate, your adjustment and the final target are shown together.
- **Choose a macro starting point.** Balanced starts at 20% protein and 30% fat, with carbs taking the rest. Muscle-focused starts at 0.8 g of protein per pound and 30% fat. Two sliders let you edit the calorie shares without changing your calorie target. Custom shares remain as your measurements or calorie target change; choosing another split or **Reset split** restores that split's defaults. Applied grams are rounded to 0.1 g. These allocations are planning starting points, not predictions from the calorie model or promises of muscle gain.
- **It's an estimate, not advice.** It is typically off by about 111 kcal, and it can't predict weight change. If you're pregnant or breastfeeding, or you follow a medically prescribed diet, skip it and enter your own target.
- **Outside the model's range?** If your inputs fall outside the data it was trained on, it says so instead of guessing. You can always type a target yourself.

## Allergies: please read

TerrierTrays can only filter on what BU Dining publishes, and **BU leaves the allergen list empty for many dishes**. An empty list does not mean allergen-free. By default, dishes with unknown allergens are left out of suggestions when you filter. Kitchens share equipment and recipes change, so **if you have an allergy, confirm with dining staff before eating.**

## Good to know

- **Menus update a few times a day.** Each menu shows when it was last fetched. If it's more than a day old, it's labelled and suggestions pause until fresh data arrives. You can still browse the menu.
- **Some nutrition is missing.** When a dish has no calorie data, totals read "at least" and say how many dishes they include.
- **Daily target rings.** Four circles show planned calories, protein, carbs and fat against your daily targets. Calories use BU's published values. Missing or loading nutrition stays labelled; partial totals use dashed progress and coverage counts.
- **Planned, not eaten.** Totals are what you planned, not a food log.
- **Return home.** The TerrierTrays logo takes you back to Plan without clearing your plates or settings. A gentle intro and navigation transitions respect reduced-motion preferences; typing never restarts the page animation.

## Your privacy

- Your measurements for the calorie estimate are **never saved or sent anywhere**.
- Your allergies and targets stay in your browser. They're only remembered if you turn on **Remember my settings on this device**, and you can delete them anytime in Settings.
- No accounts and no tracking.

## About

Built by BU students for Hackcessability (Information Access track). Menu facts come from [BU Dining](https://www.bu.edu/dining/). Fenway isn't included yet.

Want to run or contribute to the code? See the [developer guide](docs/DEVELOPMENT.md).
