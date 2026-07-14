#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"
export ANSIBLE_CONFIG="$root_dir/ansible/ansible.cfg"

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ansible-core
ansible-playbook ansible/playbooks/provision-vps.yml
