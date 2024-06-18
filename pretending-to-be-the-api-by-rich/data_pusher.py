import redis
import requests
import time
import os
import urllib.parse

redis_prefix = 'daedalus_tryout'

def get_job_status(job_id, redis_connection):
    return redis_connection.get(f"{redis_prefix}:jobs:{job_id}:status").decode()

def send_updates():
    r = redis.Redis(host='localhost', port=6379, db=0)
    while True:
        webhook_urls = r.keys(f"{redis_prefix}:webhookUrl:*:jobs")
        for webhook_url_key in webhook_urls:
            encoded_url = webhook_url_key.decode().split(":")[2]
            webhook_url = urllib.parse.unquote(encoded_url)
            job_ids = r.lrange(webhook_url_key, 0, -1)
            jobs_data = {}
            for job_id_bytes in job_ids:
                job_id = job_id_bytes.decode()
                status = get_job_status(job_id, r)
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
                response = requests.post(webhook_url, json=jobs_data)
                if response.status_code == 200:
                    for job_id in jobs_data.keys():
                        status = get_job_status(job_id, r)
                        if status == 'completed':
                            # Update status to 'completed_and_sent' and set to expire
                            r.set(f"{redis_prefix}:jobs:{job_id}:status", "completed_and_sent", ex=3600)

        time.sleep(0.05)

if __name__ == "__main__":
    send_updates()