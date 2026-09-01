import time
import random

def gen_ticket_id_py():
    t_ms = int(time.time() * 1000)
    t_hex = hex(t_ms)[2:].upper()
    rand_suffix = format(random.randint(0, 255), '02X')
    return "P-" + t_hex[-6:] + rand_suffix
