from langchain_core.messages import HumanMessage, SystemMessage
from utils.watsonx import init_llm_client


def main():
    model = init_llm_client()
    messages = [
    SystemMessage(content="Translate the following from English into Italian"),
    HumanMessage(content="hi!"),
    ]
    response = model.invoke(messages)
    print(response)


if __name__ == "__main__":
    main()
