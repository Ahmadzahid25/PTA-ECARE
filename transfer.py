import paramiko
from scp import SCPClient
import sys

def create_ssh_client(server, port, user, password):
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(server, port, user, password)
    return client

def transfer_file(server, password, local_file, remote_path):
    print(f"Transferring {local_file} to {server}...")
    ssh = create_ssh_client(server, 22, 'root', password)
    
    # Progress callback
    def progress(filename, size, sent):
        sys.stdout.write(f"\r{filename.decode('utf-8')}: {sent}/{size} bytes")
        sys.stdout.flush()

    with SCPClient(ssh.get_transport(), progress=progress) as scp:
        scp.put(local_file, remote_path=remote_path)
    
    print("\nTransfer complete.")
    ssh.close()

if __name__ == '__main__':
    password = 'AHMAD@eid123'
    # Transfer frontend
    transfer_file('192.168.10.109', password, 'frontend.tar', '/root/')
    # Transfer backend
    transfer_file('192.168.10.111', password, 'backend.tar', '/root/')
