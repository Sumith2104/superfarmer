import os
from mcp.server.fastmcp import FastMCP
from database.fluxbase import FluxbaseClient
from dotenv import load_dotenv

# Load environment variables just in case the MCP client doesn't pass them
load_dotenv()

# Create the MCP Server
mcp = FastMCP("Superfarmer Fluxbase SQL Extractor")

@mcp.tool()
def execute_sql(query: str, parameters: list = None) -> str:
    """
    Executes a SQL query against the Superfarmer Fluxbase database.
    Use this to read farmer profiles, update crop plans, check nutrient risk logs,
    manage users or monitor recommendations.
    
    Args:
        query: The raw SQL query (e.g., 'SELECT * FROM users LIMIT 5').
        parameters: Optional list of dynamic parameters to bind to the query (e.g. ['email@example.com']).
    """
    try:
        if parameters:
            result = FluxbaseClient.execute(query, tuple(parameters))
        else:
            result = FluxbaseClient.execute(query)
            
        return f"Query executed successfully.\nResult: {result}"
        
    except Exception as e:
        return f"Error executing SQL: {str(e)}"

@mcp.tool()
def read_schema() -> str:
    """
    Returns the schema definition (CREATE TABLE statements) for the Superfarmer database.
    Call this first if you don't know the table structures.
    """
    try:
        # Since Fluxbase uses predefined schemas in init_db.py, we can describe the known tables
        # or attempt to pull them from the DB if supported. Hardcoding the logic here or reading the init_db file:
        schema_path = os.path.join(os.path.dirname(__file__), 'database', 'init_db.py')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                content = f.read()
                return f"Database Initialization Schema (init_db.py):\n\n{content}"
        else:
            return "Schema file not found. Use execute_sql to run 'SHOW TABLES' or equivalent."
    except Exception as e:
        return f"Error reading schema: {str(e)}"

# Start the server listening on stdio
if __name__ == "__main__":
    mcp.run(transport='stdio')
