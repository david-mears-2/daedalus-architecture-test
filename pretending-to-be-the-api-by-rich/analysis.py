import time
import sys
import random
import redis

redis_prefix = 'daedalus_tryout'

def simulate_analysis(job_id):
    # Connect to Redis
    r = redis.Redis(host='localhost', port=6379, db=0)

    status_key = f"{redis_prefix}:jobs:{job_id}:status"
    # Set initial status to 'processing'
    r.set(status_key, "processing")

    # start_time = time.time()
    duration_in_centiseconds = random.randint(300, 1000)
    with open(f"outputs/{job_id}_output.txt", "w") as file:
        for i in range(duration_in_centiseconds):
            file.write(f"Interim result {i}\n")
            file.flush()
            time.sleep(0.01)  # Sleep for 10ms
        file.close()
    # end_time = time.time()
    # total_time = end_time - start_time
    # print(f"intended duration: about {duration_in_centiseconds / 100} seconds")
    # print(f"Total time taken: {total_time} seconds")


    # Update status to 'completed' after simulation
    r.set(status_key, "completed")

if __name__ == "__main__":
    job_id = sys.argv[1]
    simulate_analysis(job_id)