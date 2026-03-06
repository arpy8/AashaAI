set(requires
    hardware_driver
    player
    esp-tls
    esp_wifi 
    nvs_flash 
    esp_http_client 
    esp_timer 
    esp_websocket_client
    )

idf_component_register(SRCS main.c REQUIRES ${requires})