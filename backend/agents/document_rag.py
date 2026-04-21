from langchain_community.chat_message_histories import ChatMessageHistory

# Other existing code...

class SomeClass:
    def __init__(self):
        self.memories: dict[str, ChatMessageHistory] = {}

    def some_method(self, session_id: str):
        self.memories[session_id] = ChatMessageHistory()  # Updated to use ChatMessageHistory
        # Other existing code...