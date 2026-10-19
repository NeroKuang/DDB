FROM alpine:3.21

RUN apk add --no-cache curl tzdata util-linux \
  && cp /usr/share/zoneinfo/Asia/Taipei /etc/localtime \
  && echo "Asia/Taipei" > /etc/timezone

COPY crontab /etc/crontabs/root
COPY entrypoint.sh /entrypoint.sh
COPY run-job.sh /usr/local/bin/run-job.sh
COPY backfill-pay-periods.sh /usr/local/bin/backfill-pay-periods.sh

RUN chmod 0644 /etc/crontabs/root \
  && chmod 0755 /entrypoint.sh /usr/local/bin/run-job.sh \
    /usr/local/bin/backfill-pay-periods.sh \
  && touch /var/log/ddb-cron.log

ENV TZ=Asia/Taipei

ENTRYPOINT ["/entrypoint.sh"]
