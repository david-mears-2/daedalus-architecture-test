"""
Every x milliseconds, send data on all jobs (of the appropriate status) to the application server
(as distinct from the API server).
"""

import redis
import requests
import time
import os
import urllib.parse
import json

redis_prefix = 'daedalus_tryout'
max_payload_size = 100 * 1024 # 100 KB is the default max request body size in Express.

def chunk_data(data, max_size):
    """Yield successive max_size chunks from data."""
    chunk = {}
    for job_id, details in data.items():
        chunk[job_id] = details
        if len(json.dumps(chunk)) > max_size:
            # Remove the last added item that exceeded the limit
            del chunk[job_id]
            yield chunk
            chunk = {job_id: details}  # Start a new chunk with the last item
    if chunk:
        yield chunk  # Yield the last chunk

def send_updates():
    r = redis.Redis(host='localhost', port=6379, db=0)
    while True:
        webhook_urls = r.keys(f"{redis_prefix}:webhookUrl:*:jobs")
        for webhook_url_key in webhook_urls:
            encoded_url = webhook_url_key.decode().split(":")[2]
            webhook_url = urllib.parse.unquote(encoded_url)
            job_ids = r.lrange(webhook_url_key, 0, -1)
            print(f"Number of job IDs: {len(job_ids)}")
            jobs_data = {}
            for job_id_bytes in job_ids:
                job_id = job_id_bytes.decode()
                status = r.get(f"{redis_prefix}:jobs:{job_id}:status").decode()

                print(f"Job ID: {job_id}, Status: {status}")
                if status in ["processing", "completed"]:
                    # Read the output from the file
                    output_file_path = f"outputs/{job_id}_output.txt"
                    if os.path.exists(output_file_path):
                        with open(output_file_path, 'r') as file:
                            output = file.read()
                    else:
                        output = "Output not found."
                    jobs_data[job_id] = {"status": status, "output": output}
            
            if jobs_data:
                print('webhook url: ' + webhook_url)

            # Split and send jobs_data in chunks
            for chunk in chunk_data(jobs_data, max_payload_size):
                print('webhook url: ' + webhook_url)
                response = requests.post(webhook_url, json=chunk)
                if response.status_code == 200:
                    for job_id in chunk.keys():
                        status = jobs_data[job_id]["status"]
                        if status == 'completed':
                            r.set(f"{redis_prefix}:jobs:{job_id}:status", "completed_and_sent", ex=3600)

        time.sleep(0.05)

if __name__ == "__main__":
    send_updates()