# WatsonX LLM Project

This project demonstrates how to use IBM WatsonX AI with LangChain for language model interactions.

## Setup

Before running the application, you need to install the project dependencies:

```bash
uv sync
```

This command will install all required packages specified in `pyproject.toml`.

### Environment Variables

Make sure you have a `.env` file in the project root with your WatsonX credentials:

```
WATSONX_APIKEY=your_api_key_here
WATSONX_PROJECT=your_project_id_here
```

## Running the Application

Once dependencies are installed and your `.env` file is configured, run the application with:

```bash
uv run main.py
```

This will execute the main script and display the model's response to your configured messages.

## Customizing Model Inputs

To modify the inputs sent to the model, edit `main.py`:

### Changing the System Message

The system message sets the context or instructions for the model. Modify the `SystemMessage` content:

```python
SystemMessage(content="Translate the following from English into Italian"),
```

### Changing the User Input

The user input is what you want the model to process. Modify the `HumanMessage` content:

```python
HumanMessage(content="hi!"),
```

### Adding More Messages

You can add multiple messages to create a conversation:

```python
messages = [
    SystemMessage(content="You are a helpful assistant"),
    HumanMessage(content="What's the weather like?"),
    HumanMessage(content="Tell me a joke"),
]
```

## Configuring the Model

To adjust the model's behavior and parameters, edit `utils/watsonx.py`:

### TextChatParameters

Modify these parameters in the `init_llm_client()` function:

- **max_completion_tokens** (default: 2000): Maximum number of tokens in the response
  ```python
  max_completion_tokens=2000,
  ```

- **temperature** (default: 0.5): Controls randomness (0.0 = deterministic, 1.0 = creative)
  ```python
  temperature=0.5,
  ```

- **top_p** (default: 1): Controls diversity via nucleus sampling
  ```python
  top_p=1,
  ```

### ChatWatsonx Configuration

You can also modify these settings:

- **model_id**: The specific model to use
  ```python
  model_id="openai/gpt-oss-120b",
  ```

- **url**: The WatsonX service endpoint
  ```python
  url="https://us-south.ml.cloud.ibm.com",
  ```

Note: The `apikey` and `project_id` are pulled from your `.env` file and should not be hardcoded.

## Example Workflow

1. Install dependencies: `uv sync`
2. Configure your `.env` file with credentials
3. Edit `main.py` to customize your prompt and input
4. Optionally edit `utils/watsonx.py` to adjust model parameters
5. Run the application: `uv run main.py`
6. View the model's response in the terminal
