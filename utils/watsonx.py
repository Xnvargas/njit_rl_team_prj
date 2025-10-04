from ibm_watsonx_ai.foundation_models.schema import TextChatParameters
from langchain_ibm import ChatWatsonx
from dotenv import load_dotenv
import os

def init_llm_client():
    """
    Initialize the watsonx client that pulls credentials from .env file
    """
    try:
        # load environment variables from .env file (requires `python-dotenv`)
        load_dotenv()
        watsonx_key = os.environ.get("WATSONX_APIKEY")
        watsonx_project = os.environ.get("WATSONX_PROJECT") 
        parameters = TextChatParameters(
        max_completion_tokens=2000,
        temperature=0.5,
        top_p=1,
        )
        watsonx_llm = ChatWatsonx(
            model_id="openai/gpt-oss-120b",
            url="https://us-south.ml.cloud.ibm.com",
            apikey=watsonx_key,
            project_id=watsonx_project,
            params=parameters,
        )
        return watsonx_llm
    except ImportError:
        print("Error importing credentials from environment!")

