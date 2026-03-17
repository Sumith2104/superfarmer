import asyncio
import os
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool

class MCPGeminiBridge:
    def __init__(self, mcp_script_path: str):
        self.mcp_script_path = mcp_script_path

    async def _run_gemini_with_mcp(self, prompt: str, system_instruction: str = None) -> str:
        # 1. Connect to the MCP Server
        server_params = StdioServerParameters(
            command="python",
            args=[self.mcp_script_path]
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                # 2. Get Tools from MCP Server
                mcp_tools = await session.list_tools()
                
                gemini_functions = []
                # Map MCP tools to Gemini FunctionDeclarations
                for tool in mcp_tools.tools:
                    # In a robust implementation, you translate the JSON schema to Gemini Schema.
                    # For simplicity, we define the execute_sql tool explicitly here 
                    # since we know the exact signature of our Fluxbase MCP.
                    if tool.name == "execute_sql":
                        execute_sql_func = FunctionDeclaration(
                            name="execute_sql",
                            description=tool.description,
                            parameters={
                                "type": "OBJECT",
                                "properties": {
                                    "query": {
                                        "type": "STRING",
                                        "description": "The raw SQL query."
                                    },
                                    "parameters": {
                                        "type": "ARRAY",
                                        "items": {"type": "STRING"},
                                        "description": "Optional parameters to bind."
                                    }
                                },
                                "required": ["query"]
                            }
                        )
                        gemini_functions.append(execute_sql_func)
                
                if not gemini_functions:
                    gemini_tool = None
                else:
                    gemini_tool = Tool(function_declarations=gemini_functions)

                # 3. Initialize Gemini Model with the tools
                model = genai.GenerativeModel(
                    'models/gemini-2.5-flash',
                    tools=[gemini_tool] if gemini_tool else None,
                    system_instruction=system_instruction
                )
                
                # 4. Start Chat and Send Prompt
                chat = model.start_chat()
                response = chat.send_message(prompt)
                
                # 5. Handle Tool Calls
                while True:
                    # Check if Gemini wants to call a function
                    part = response.parts[0]
                    if hasattr(part, 'function_call') and type(part.function_call).__name__ != 'NoneType' and getattr(part.function_call, 'name', None):
                        fc = part.function_call
                        tool_name = fc.name
                        args = {k: v for k, v in fc.args.items()}
                        print(f"🤖 Agent autonomous tool call: {tool_name}({args})")
                        
                        try:
                            # Call the real MCP server
                            mcp_result = await session.call_tool(tool_name, arguments=args)
                            
                            # MCP returns a list of text/image contents.
                            # Extract the text string to pass back to Gemini.
                            result_str = mcp_result.content[0].text if mcp_result.content else "No output"
                            if mcp_result.isError:
                                print(f"❌ Tool execution returned an error: {result_str}")
                            else:
                                print(f"✅ Tool execution successful: {result_str}")
                        except Exception as e:
                            print(f"❌ Exception calling tool: {e}")
                            result_str = str(e)
                            
                        # Send the result back to Gemini so it can continue reasoning
                        response = chat.send_message(
                            genai.protos.Part(
                                function_response=genai.protos.FunctionResponse(
                                    name=tool_name,
                                    response={"result": result_str}
                                )
                            )
                        )
                        # No more tool calls required
                        print("🤖 Agent finished tool loops.")
                        break
                        
                return response.text

    def execute_prompt(self, prompt: str, system_instruction: str = None) -> str:
        """Run the async logic synchronously so it can be called from standard Flask routes."""
        try:
            # Try to get existing loop, else create new one
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        return loop.run_until_complete(self._run_gemini_with_mcp(prompt, system_instruction))
