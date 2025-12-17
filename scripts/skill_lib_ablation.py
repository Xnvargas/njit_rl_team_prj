import os
import argparse
from dotenv import load_dotenv
from voyager import Voyager


def run_once(mc_port, skill_library_dir, ckpt_dir, sub_goals, discovery_csv_path):
    voyager = Voyager(
        mc_port=mc_port,
        skill_library_dir=skill_library_dir,
        ckpt_dir=ckpt_dir,
        resume=False,
        discovery_csv_path=discovery_csv_path,
    )
    print(f"\n=== Running: ckpt_dir={ckpt_dir} | skill_library_dir={skill_library_dir} ===")
    print(f"    Logging to: {discovery_csv_path}")
    voyager.inference(sub_goals=sub_goals)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["with", "without", "both"], default="with")
    parser.add_argument("--skill-lib", default="./skill_library/rob_trial1")
    parser.add_argument("--task", default="Craft 1 iron pickaxe")
    parser.add_argument("--with-dir", default="MUGUNTHAN_CKPT_DIR_with_skill_lib")
    parser.add_argument("--without-dir", default="MUGUNTHAN_CKPT_DIR_without_skill_lib")
    args = parser.parse_args()

    load_dotenv()
    mc_port = os.environ.get("MC_PORT")
    if not mc_port:
        raise RuntimeError("MC_PORT is not set (check your .env).")

    # Decompose once (fair comparison)
    v_for_decompose = Voyager(
        mc_port=mc_port,
        skill_library_dir=args.skill_lib if args.mode in ("with", "both") else None,
        ckpt_dir=args.with_dir if args.mode in ("with", "both") else args.without_dir,
        resume=False,
        max_iterations=50
    )
    sub_goals = v_for_decompose.decompose_task(task=args.task)
    print("\nTask:", args.task)
    print("Sub-goals:")
    print(sub_goals)

    if args.mode in ("with", "both"):
        run_once(
            mc_port, 
            args.skill_lib, 
            args.with_dir, 
            sub_goals,
            discovery_csv_path="./logs/item_discovery_with_skill_lib.csv"
        )

    if args.mode in ("without", "both"):
        run_once(
            mc_port, 
            None, 
            args.without_dir, 
            sub_goals,
            discovery_csv_path="./logs/item_discovery_without_skill_lib.csv"
        )


if __name__ == "__main__":
    main()