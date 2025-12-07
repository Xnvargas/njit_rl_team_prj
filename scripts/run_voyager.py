import os
from dotenv import load_dotenv
import time
from voyager import Voyager

t0 = time.perf_counter()

load_dotenv()
MC_PORT = os.environ.get("MC_PORT")

voyager = Voyager(
    mc_port=MC_PORT,
    resume=False,
)

voyager.learn()

print(f"\033[32mVoyager execution elapsed time={time.perf_counter() - t0:.2f}s\033[0m")