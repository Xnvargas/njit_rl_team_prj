from ibm_watsonx_ai.foundation_models.schema import TextChatParameters
from ibm_watsonx_ai.metanames import EmbedTextParamsMetaNames
from langchain_ibm import ChatWatsonx
from langchain_ibm import WatsonxEmbeddings
from dotenv import load_dotenv
import os

def init_llm_client():
    """
    Initialize the watsonx llm that pulls credentials from .env file
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

def init_embedding_client():
    """
    Initialize the watsonx embeddings that pulls credentials from .env file
    """
    try:
        # load environment variables from .env file (requires `python-dotenv`)
        load_dotenv()
        watsonx_key = os.environ.get("WATSONX_APIKEY")
        watsonx_project = os.environ.get("WATSONX_PROJECT") 
        parameters = {
            EmbedTextParamsMetaNames.TRUNCATE_INPUT_TOKENS: 3,
            EmbedTextParamsMetaNames.RETURN_OPTIONS: {"input_text": True},
        }
        watsonx_embedder = WatsonxEmbeddings(
            model_id="ibm/granite-embedding-107m-multilingual",
            url="https://us-south.ml.cloud.ibm.com",
            apikey=watsonx_key,
            project_id=watsonx_project,
            params=parameters,
        )
        return watsonx_embedder
    except ImportError:
        print("Error importing credentials from environment!")