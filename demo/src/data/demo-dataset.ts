export const datasetVersion = 'home-wifi-en-v3';
export interface DemoDocument { id: string; title: string; text: string }
export interface Turn { id: string; text: string; humanQuery: string }

/**
 * A deliberately contrastive mini-corpus for the demo.
 *
 * The documents share a realistic vocabulary, but each one has a different
 * decision boundary. That lets Raw, PRF, Rewrite, and Human expose different
 * failure modes instead of converging on the same answer for every turn.
 */
export const documents: DemoDocument[] = [
  {
    id: 'D01',
    title: 'Router placement across a concrete floor',
    text: `An upstairs bedroom can become a Wi-Fi dead zone even when a speed test beside the router is normal. A reinforced-concrete floor, brick walls, a metal cabinet, or a television can absorb or reflect the signal between the ground-floor living room and the bedroom. First compare the connection beside the router, in the stairwell, and at the desk where the problem occurs. This separates a coverage problem from a slow ISP line.

Move the router into an open, elevated position closer to the stairs, then test one position at a time. Keep it away from cabinets, large metal objects, and microwaves. An open stairwell may reduce the obstacles between floors, but placement is not a guaranteed fix for every building. If the signal is strong in the stairwell but weak at the desk, plan the next access point around that transition instead of buying equipment blindly.`
  },
  {
    id: 'D02',
    title: '2.4 GHz or 5 GHz through walls and floors',
    text: `The 2.4 GHz and 5 GHz bands make different trade-offs for a home network. 2.4 GHz usually travels farther and penetrates walls and a concrete floor better, while 5 GHz usually provides more speed and more clean channels near the access point. The 2.4 GHz band is also more crowded, so neighboring networks, Bluetooth devices, and household electronics can add interference.

Test both bands at the upstairs desk rather than trusting the signal icon alone. A stable 2.4 GHz connection may beat a fast but fragile 5 GHz connection through a floor. Channel congestion can change the result at busy times. Carrier 5G on a phone is not the same thing as the 5 GHz Wi-Fi band from a home router.`
  },
  {
    id: 'D03',
    title: 'Range extender or repeater for one dead zone',
    text: `A range extender, also called a Wi-Fi repeater or booster, receives a router signal and retransmits it into a nearby dead zone. For one room, place it where the original signal is still reasonably strong—often a hallway or stair landing—not in the deepest corner of the bedroom. A repeater plugged into a dead corner only repeats a weak connection.

Many single-radio repeaters share airtime between the wireless hop back to the router and the client device. That can reduce throughput and increase latency during a video call, although the size of the loss depends on the hardware and interference. A repeater can be inexpensive for a small gap, but it is not the same as a coordinated multi-node system and roaming may be uneven.`
  },
  {
    id: 'D04',
    title: 'Mesh Wi-Fi for whole-home roaming',
    text: `A mesh Wi-Fi system uses a main node and secondary nodes managed as one system. The nodes normally share one network name and coordinate coverage across several rooms and floors. A phone may move to a more suitable node without the user selecting a second network, although the device still controls much of the roaming decision.

Mesh is useful when a two-story home has more than one weak area or when people move between rooms. Wireless mesh backhaul still depends on the link between nodes, so a node should sit where the upstream signal is healthy rather than at the farthest edge. Mesh simplifies management and roaming; it does not create extra ISP bandwidth or remove a concrete-floor bottleneck by itself.`
  },
  {
    id: 'D05',
    title: 'Ethernet backhaul over Cat6',
    text: `Ethernet backhaul connects a secondary mesh node to the main node with a network cable, often Cat6, instead of using a wireless link between them. Client devices can remain on Wi-Fi; the cable carries the internal traffic between access points. Removing the weak wireless hop can make throughput and latency more stable when a concrete floor or busy radio environment is the bottleneck.

Wired backhaul is especially useful for several simultaneous video calls, a fixed upstairs office, or a node that must sit close to the room needing coverage. Confirm that the mesh kit supports Ethernet backhaul, use the correct LAN ports, and follow its wiring diagram. The improvement is limited by the cable, network ports, and ISP plan; wiring does not increase the subscription bandwidth.`
  },
  {
    id: 'D06',
    title: 'Keep the ISP router with Access Point mode',
    text: `A mesh system can work behind an existing ISP modem or router. If the ISP device should continue to perform routing and DHCP, configure the mesh in Access Point mode, sometimes shortened to AP mode. Connect a LAN port on the ISP router to the main mesh node as the manufacturer specifies. This avoids the common double-NAT arrangement in which both devices try to route the same home network.

AP mode may remove some mesh features, such as certain parental controls or traffic-management tools, so check the exact model. Bridge mode is a different change and may affect authentication or television service. After setup, test internet access and connections between devices. Turning off the old router's Wi-Fi can reduce overlapping networks when the mesh already covers the home.`
  },
  {
    id: 'D07',
    title: 'Powerline networking when cable routes are difficult',
    text: `A powerline adapter sends network traffic over a home's electrical wiring. It can be an alternative when running Ethernet between floors is difficult, but both adapters need suitable wall outlets and the same electrical path. Performance varies with circuit layout, distance, electrical noise, and the quality of the adapters. A powerline link is not automatically as fast or stable as a direct Ethernet cable.

Some mesh kits can use a powerline connection as the wired path to a node, while others cannot. Test latency and throughput at the actual desk, especially during a video call. Avoid judging the link from the advertised rate on the box. Powerline solves a cable-routing problem; it does not fix a weak cellular signal or extend Bluetooth audio directly.`
  },
  {
    id: 'D08',
    title: 'Channel congestion and DFS troubleshooting',
    text: `A home can have strong Wi-Fi signal bars and still suffer from slow or unstable service when neighboring networks crowd the same channel. The 2.4 GHz band has fewer non-overlapping choices, while 5 GHz usually offers more capacity but may use DFS channels that must vacate when radar is detected. Automatic channel selection can change after a restart or during a busy evening.

Compare latency and packet loss at the same desk before and after changing a channel. Do not confuse a congested radio channel with a weak signal through a concrete floor. A clean channel cannot make an out-of-range node reliable, and moving to 5 GHz does not turn a phone's carrier 5G service into home Wi-Fi. Channel changes are a troubleshooting step, not a replacement for better placement or a wired backhaul.`
  },
  {
    id: 'D09',
    title: 'Bluetooth headset range is not Wi-Fi coverage',
    text: `A Bluetooth headset can cut out when a person walks upstairs while the phone remains downstairs. Distance, walls, the human body, a low battery, and a crowded 2.4 GHz radio environment can all affect the short-range Bluetooth link. Compare the headset with the phone nearby, try the phone on the same side of the body, and test a wired headset or speakers during a call.

Wi-Fi and Bluetooth may share spectrum, but a Wi-Fi repeater or mesh node does not relay an ordinary Bluetooth connection. A stable internet connection does not prove that the headset link is healthy, and a Wi-Fi dead-zone fix may leave the audio problem unchanged. Identify whether the failing path is Bluetooth, Wi-Fi, or the internet before buying network equipment.`
  },
  {
    id: 'D10',
    title: 'Cellular 5G is different from 5 GHz Wi-Fi',
    text: `A phone's cellular 5G service comes from a carrier and nearby cell sites; 5 GHz Wi-Fi comes from the access point in the home. The two labels look similar but describe different radio networks. A phone can show strong carrier 5G outside while receiving weak home Wi-Fi upstairs, or it can have good Wi-Fi while cellular service is poor indoors.

Test the phone with Wi-Fi enabled and disabled, and compare the result near a window or outside. A normal home repeater or mesh system does not amplify the carrier's mobile signal. Wi-Fi Calling may help in a weak-cellular location when the device and carrier support it, but changing a mobile plan does not extend the router's Wi-Fi coverage.`
  },
];

const questions = [
  [
    'My upstairs bedroom loses Wi-Fi during video calls, but a speed test beside the router is normal. What should I check first?',
    'Diagnose an upstairs bedroom Wi-Fi dead zone when speed beside the router is normal, starting with router placement and concrete-floor obstacles.',
  ],
  [
    'Would moving it help, or should I try the other band?',
    'Check whether moving the Wi-Fi router near an open stairwell can improve an upstairs bedroom dead zone caused by a concrete floor.',
  ],
  [
    'Which one should I use through that floor?',
    'Choose between 2.4 GHz and 5 GHz Wi-Fi for an upstairs bedroom separated by a concrete floor, balancing range and interference.',
  ],
  [
    'The audio is still choppy. What should I add?',
    'Evaluate a Wi-Fi range extender or repeater for one upstairs room when video-call throughput matters, including its wireless-hop trade-off.',
  ],
  [
    'If I do not want the same trade-off, what is the coordinated option?',
    'Compare coordinated mesh Wi-Fi with a range extender for whole-home two-story coverage and roaming across several rooms.',
  ],
  [
    'How is mesh different if I keep the link wireless?',
    'Compare wireless mesh backhaul with a standalone Wi-Fi repeater, focusing on coordination, placement, and throughput.',
  ],
  [
    'I cannot change the route between floors yet. Where should the extra one go?',
    'Place a secondary mesh node near the stairwell for wireless backhaul, and consider powerline networking only as an alternative when Ethernet is difficult.',
  ],
  [
    'Would changing the setup later be worth it?',
    'Explain the benefits of Ethernet backhaul between mesh nodes for stable latency and video calls compared with a wireless link.',
  ],
  [
    'Can the first one stay in charge?',
    'Configure a mesh system in Access Point mode while keeping the ISP modem or router and avoiding double NAT.',
  ],
  [
    'My phone still loses its signal upstairs. Is that covered too?',
    'Distinguish weak cellular 5G indoors from weak 5 GHz home Wi-Fi; a mesh or repeater does not amplify the carrier signal.',
  ],
];

export const conversation = {
  id: 'home-wifi',
  turns: questions.map(([text, humanQuery], i): Turn => ({ id: `T${i + 1}`, text, humanQuery })),
};
