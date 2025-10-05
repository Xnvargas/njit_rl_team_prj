import os
from dotenv import load_dotenv
from voyager import Voyager

load_dotenv()
MC_PORT = os.environ.get("MC_PORT")

voyager = Voyager(
    mc_port=MC_PORT,
)

voyager.learn()