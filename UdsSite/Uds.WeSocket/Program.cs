
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using StackExchange.NetGain;
using StackExchange.NetGain.WebSockets;
using TcpClient = StackExchange.NetGain.TcpClient;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace ConsoleApplication1 {
    class Program {
        static ConnectionMultiplexer redis = ConnectionMultiplexer.Connect("localhost");
        private static TcpServer server = new TcpServer();

        static void Main() {
            IPEndPoint endpoint = new IPEndPoint(IPAddress.Loopback, 6002);

            server.ProtocolFactory = WebSocketsSelectorProcessor.Default;
            server.ConnectionTimeoutSeconds = 60;
            server.Received += msg => {
                redis.GetSubscriber()
                    .Publish(new RedisChannel("request", RedisChannel.PatternMode.Auto),
                        msg.Value.ToString());
            };
            redis.GetSubscriber()
                .Subscribe(new RedisChannel("response", RedisChannel.PatternMode.Auto),
                    (channel, value) => server.Broadcast(value.ToString()));


            server.Start("abc", endpoint);
            Console.WriteLine("Server running");

            Console.ReadKey();

            Console.WriteLine("Server dead; press any key");
            Console.ReadKey();
        }

    }

}
