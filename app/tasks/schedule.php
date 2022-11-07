<?php

ini_set('memory_limit', -1);
ini_set('max_execution_time', -1);
global $cli;
global $register;

use Cron\CronExpression;
use Utopia\App;
use Utopia\CLI\Console;
use Utopia\Database\DateTime;
use Utopia\Database\Query;
use Swoole\Timer;

const FUNCTION_VALIDATION_TIMER = 180; //seconds
const FUNCTION_ENQUEUE_TIMER = 60; //seconds
const ENQUEUE_TIME_FRAME = 60 * 5; // 5 min
sleep(4); // Todo prevent PDOException


/**
 * 1. first load from db with limit+offset --line 82--
 * 2. creating a 5-min offset array ($queue) --line 102--
 * 3. First timer runs every minute, looping over $queue time slots (each slot is 1-min delta)
 *    if the function matches the current minute it should be dispatched to the functions worker.
 *    Then another translation is made to the cron pattern if it is in the next 5-min window
 *    it is assigned again to the  $queue. --line 172--.
 * 4. Second timer  runs every X min and updates the $functions (large) list.
 *    The query fetches only functions that [resourceUpdatedAt] attr changed from the
 *    last time the timer that was fired (X min) --line 120--
 *    If the function was deleted it is unsets from the list ($functions) and the $queue.
 *    In the end of the timer the $queue is created again.
 *
 */

$cli
->task('schedule')
->desc('Function scheduler task')
->action(function () use ($register) {
    Console::title('Scheduler V1');
    Console::success(APP_NAME . ' Scheduler v1 has started');

    $createQueue = function () use (&$functions, &$queue) {
        $loadStart = \microtime(true);
        /**
         * Creating smaller functions list containing 5-min timeframe.
         */
        $timeFrame = DateTime::addSeconds(new \DateTime(), ENQUEUE_TIME_FRAME);
        foreach ($functions as $function) {
            $cron = new CronExpression($function['schedule']);
            $next = DateTime::format($cron->getNextRunDate());
            if ($next < $timeFrame) {
                $queue[$next][$function['resourceId']] = $function;
            }
        }
        $loadEnd = \microtime(true);
        Console::error("Queue was built in " . ($loadEnd - $loadStart) . " seconds");
    };

    $removeFromQueue = function ($scheduleId) use (&$queue) {
        foreach ($queue as $slot => $schedule) {
            foreach ($schedule as $function) {
                if ($scheduleId === $function['resourceId']) {
                    Console::error("Unsetting :{$function['resourceId']} from queue slot $slot");
                    unset($queue[$slot][$function['resourceId']]);
                }
            }
        }
    };

    $dbForConsole = getConsoleDB();
    $limit = 200;
    $sum = $limit;
    $functions = [];
    $queue = [];
    $count = 0;
    $loadStart = \microtime(true);
    $total = 0;
    /**
     * Initial run fill $functions list
     */
    while ($sum === $limit) {
        $results = $dbForConsole->find('schedules', [
            Query::equal('region', [App::getEnv('_APP_REGION')]),
            Query::equal('resourceType', ['function']),
            Query::equal('active', [true]),
            Query::offset($count * $limit),
            Query::limit($limit),
        ]);

        $sum = count($results);
        $total = $total + $sum;
        foreach ($results as $document) {
            $functions[$document['resourceId']] = $document;
        }
        $count++;
    }

    $loadEnd = \microtime(true);
    Console::error("{$total} functions where loaded in " . ($loadEnd - $loadStart) . " seconds");

    $createQueue();

    $lastUpdate =  DateTime::addSeconds(new \DateTime(), -FUNCTION_VALIDATION_TIMER);

    Co\run(
        function () use ($removeFromQueue, $createQueue, $dbForConsole, &$functions, &$queue, &$lastUpdate) {
            Timer::tick(FUNCTION_VALIDATION_TIMER * 1000, function () use ($removeFromQueue, $createQueue, $dbForConsole, &$functions, &$queue, &$lastUpdate) {
                $time = DateTime::now();
                $count = 0;
                $limit = 200;
                $sum = $limit;
                $total = 0;
                $timerStart = \microtime(true);

                Console::info("Update proc run at: $time last update was at $lastUpdate");
                /**
                 * Updating functions list from DB.
                 */
                while (!empty($sum)) {
                    $results = $dbForConsole->find('schedules', [
                        Query::equal('region', [App::getEnv('_APP_REGION')]),
                        Query::equal('resourceType', ['function']),
                        Query::greaterThan('resourceUpdatedAt', $lastUpdate),
                        Query::limit($limit),
                        Query::offset($count * $limit),
                    ]);
                    $sum = count($results);
                    $total = $total + $sum;
                    foreach ($results as $document) {
                        $org = isset($functions[$document['resourceId']]) ? strtotime($functions[$document['resourceId']]['resourceUpdatedAt']) : null;
                        $new = strtotime($document['resourceUpdatedAt']);
                        if ($document['active'] === false) {
                            Console::error("Removing:  {$document['resourceId']}");
                            unset($functions[$document['resourceId']]);
                        } elseif ($new > $org) {
                            Console::error("Updating:  {$document['resourceId']}");
                            $functions[$document['resourceId']] =  $document;
                        }
                        $removeFromQueue($document['resourceId']);
                    }
                    $count++;
                }
                $lastUpdate = DateTime::now();
                $createQueue();
                $timerEnd = \microtime(true);

                Console::error("Update timer: {$total} functions where updated in " . ($timerStart - $timerEnd) . " seconds");
            });

            Timer::tick(FUNCTION_ENQUEUE_TIMER * 1000, function () use ($dbForConsole, &$functions, &$queue) {
                $timerStart = \microtime(true);
                $time = DateTime::now();
                $timeFrame =  DateTime::addSeconds(new \DateTime(), ENQUEUE_TIME_FRAME); /** 5 min */
                $now = (new \DateTime())->format('Y-m-d H:i:00.000');

                Console::info("Enqueue proc run at: $time");
                // Debug
        //                foreach ($queue as $slot => $schedule) {
        //                    Console::log("Slot: $slot");
        //                    foreach ($schedule as $function) {
        //                            Console::log("{$function['resourceId']} {$function['schedule']}");
        //                    }
        //                }

                /**
                 * Lopping time slots
                 */

                foreach ($queue as $slot => $schedule) {
                    if ($now === $slot) {
                        foreach ($schedule as $function) {
                        /**
                         * Enqueue function (here should be the Enqueue call
                         */
                            Console::warning("Enqueueing :{$function['resourceId']}");
                            $cron = new CronExpression($function['schedule']);
                            $next = DateTime::format($cron->getNextRunDate());

                            /**
                             * If next schedule is in 5-min timeframe
                             * and it was not removed or changed, re-enqueue the function.
                             */
                            if (
                                $next < $timeFrame &&
                                !empty($functions[$function['resourceId']] &&
                                $function['schedule'] === $functions[$function['resourceId']]['schedule'])
                            ) {
                                Console::warning("re-enqueueing :{$function['resourceId']}");
                                $queue[$next][$function['resourceId']] = $function;
                            }
                            unset($queue[$slot][$function['resourceId']]); /** removing function from slot */
                        }
                        unset($queue[$slot]); /** removing slot */
                    }
                }
                $timerEnd = \microtime(true);
                Console::error("Queue timer: finished in " . ($timerStart - $timerEnd) . " seconds");
            });
        }
    );
});
