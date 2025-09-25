#!/bin/bash

# Скрипт для автоматического обновления времени последнего обновления на всех страницах

# Получаем текущую дату и время в нужном формате
CURRENT_TIME=$(date '+%d.%m.%Y, %H:%M:%S')

echo "Обновляем отметки времени на: $CURRENT_TIME"

# Функция для обновления времени в файле
update_timestamp() {
    local file=$1
    if [ -f "$file" ]; then
        # Заменяем статичную дату на текущую
        sed -i '' "s/Обновлено: [0-9][0-9]\.[0-9][0-9]\.[0-9][0-9][0-9][0-9], [0-9][0-9]:[0-9][0-9]:[0-9][0-9]/Обновлено: $CURRENT_TIME/g" "$file"
        echo "Обновлен файл: $file"
    fi
}

# Обновляем все HTML файлы
update_timestamp "public/index.html"
update_timestamp "public/entry.html"
update_timestamp "public/general/disc-test.html"
update_timestamp "public/general/hubbard-test.html"
update_timestamp "public/general/eq-test.html"
update_timestamp "public/general/aptitude-test.html"
update_timestamp "public/general/integrity-test.html"
update_timestamp "public/general/oca-test.html"
update_timestamp "public/broker/spq-test.html"
update_timestamp "public/manager/kfu-manager-test.html"

echo "Все отметки времени обновлены!"
