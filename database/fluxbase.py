import requests
from config import FLUXBASE_CONFIG

class FluxbaseClient:
    @staticmethod
    def execute(query, params=None):
        base_url = FLUXBASE_CONFIG['url'].rstrip('/')
        if base_url.endswith('/api'):
            base_url = base_url[:-4]
        url = f"{base_url}/api/execute-sql"
        headers = {
            'Content-Type': 'application/json',
            'x-project-id': FLUXBASE_CONFIG['project_id'],
            'Authorization': f"Bearer {FLUXBASE_CONFIG['api_key']}"
        }
        
        payload = {"query": query}
        if params:
            payload["params"] = list(params)
        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get('result', {}).get('rows', [])
        except Exception as e:
            print(f"Fluxbase Query Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            raise e
